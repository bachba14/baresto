-- Baresto — fiches clients, liste d'attente, gestion de la réservation par le client, e-mails, temps réel
--
-- À exécuter après 0002. Migration additive : aucune donnée n'est supprimée.

-- ─────────────────────────────────────────────────────────────
-- Réglages restaurant
-- ─────────────────────────────────────────────────────────────

alter table public.restaurants
  add column if not exists review_url text,
  add column if not exists send_reminders boolean not null default true;

-- ─────────────────────────────────────────────────────────────
-- Fiches clients (une par e-mail ou téléphone, par restaurant)
-- ─────────────────────────────────────────────────────────────

-- Clé de téléphone : les 9 derniers chiffres (identique pour « 06 12… », « +33 6 12… », « 0470… », « +32 470… »).
create or replace function public.phone_key(p_phone text)
returns text
language sql immutable set search_path = public
as $$
  select case when length(d) >= 6 then right(d, 9) end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) x;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  email text check (email = lower(email)),
  phone text,
  phone_key text,
  notes text,
  tags text[] not null default '{}',
  -- Compteurs tenus à jour par trigger (réservations non annulées, non venues, annulées).
  reservation_count int not null default 0,
  no_show_count int not null default 0,
  cancelled_count int not null default 0,
  first_date date,
  last_date date,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id),
  unique (restaurant_id, email)
);
create index if not exists customers_phone_idx on public.customers (restaurant_id, phone_key);
create index if not exists customers_last_idx on public.customers (restaurant_id, last_date desc);

-- ─────────────────────────────────────────────────────────────
-- Réservations : lien de gestion, client, suivi des e-mails
-- ─────────────────────────────────────────────────────────────

alter table public.reservations
  add column if not exists token text default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column if not exists customer_id uuid,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists review_requested_at timestamptz;

update public.reservations
set token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where token is null;
alter table public.reservations alter column token set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_token_key') then
    alter table public.reservations add constraint reservations_token_key unique (token);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservations_customer_fk') then
    -- Le client appartient au même restaurant que la réservation.
    alter table public.reservations add constraint reservations_customer_fk
      foreign key (customer_id, restaurant_id) references public.customers (id, restaurant_id)
      on delete set null (customer_id);
  end if;
end $$;
create index if not exists reservations_customer_idx on public.reservations (customer_id);

-- Retrouve (ou crée) la fiche client d'une réservation : e-mail d'abord, puis téléphone.
create or replace function public.find_or_create_customer(p_restaurant uuid, p_name text, p_email text, p_phone text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_key text := public.phone_key(p_phone);
begin
  if v_email is null and v_key is null then
    return null;
  end if;

  if v_email is not null then
    select id into v_id from public.customers where restaurant_id = p_restaurant and email = v_email;
  end if;
  if v_id is null and v_key is not null then
    select id into v_id from public.customers
    where restaurant_id = p_restaurant and phone_key = v_key
    order by created_at limit 1;
  end if;

  if v_id is null then
    insert into public.customers (restaurant_id, name, email, phone, phone_key)
    values (p_restaurant, coalesce(nullif(trim(p_name), ''), 'Client'), v_email, v_phone, v_key)
    on conflict do nothing
    returning id into v_id;
    if v_id is null then  -- créée entre-temps par une réservation simultanée
      select id into v_id from public.customers where restaurant_id = p_restaurant and email = v_email;
    end if;
  else
    -- Complète la fiche sans écraser ce que le restaurateur a corrigé.
    update public.customers
    set email = coalesce(email, v_email),
        phone = coalesce(phone, v_phone),
        phone_key = coalesce(phone_key, v_key)
    where id = v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.link_customer()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.customer_id is null then
    new.customer_id := public.find_or_create_customer(new.restaurant_id, new.name, new.email, new.phone);
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_link_customer on public.reservations;
create trigger reservations_link_customer
  before insert on public.reservations
  for each row execute function public.link_customer();

create or replace function public.refresh_customer(p_customer uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.customers c
  set reservation_count = s.total,
      no_show_count = s.no_shows,
      cancelled_count = s.cancelled,
      first_date = s.first_date,
      last_date = s.last_date
  from (
    select
      count(*) filter (where status not in ('cancelled', 'no_show'))::int as total,
      count(*) filter (where status = 'no_show')::int as no_shows,
      count(*) filter (where status = 'cancelled')::int as cancelled,
      min(date) filter (where status not in ('cancelled', 'no_show')) as first_date,
      max(date) filter (where status not in ('cancelled', 'no_show')) as last_date
    from public.reservations where customer_id = p_customer
  ) s
  where c.id = p_customer;
$$;

create or replace function public.reservations_refresh_customer()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.customer_id is not null then
    perform public.refresh_customer(old.customer_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.customer_id is not null
     and (tg_op = 'INSERT' or new.customer_id is distinct from old.customer_id) then
    perform public.refresh_customer(new.customer_id);
  end if;
  return null;
end;
$$;

drop trigger if exists reservations_refresh_customer on public.reservations;
create trigger reservations_refresh_customer
  after insert or delete or update of status, date, customer_id on public.reservations
  for each row execute function public.reservations_refresh_customer();

-- Rattache les réservations existantes à des fiches clients.
do $$
declare
  r record;
begin
  for r in
    select id, restaurant_id, name, email, phone from public.reservations
    where customer_id is null and (email is not null or phone is not null)
    order by created_at
  loop
    update public.reservations
    set customer_id = public.find_or_create_customer(r.restaurant_id, r.name, r.email, r.phone)
    where id = r.id;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Liste d'attente
-- ─────────────────────────────────────────────────────────────

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  date date not null,
  time time,                       -- horaire souhaité (facultatif)
  party_size int not null check (party_size > 0),
  name text not null,
  email text not null,
  phone text,
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'booked', 'cancelled')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists waitlist_restaurant_date_idx on public.waitlist (restaurant_id, date, status);

create or replace function public.join_waitlist(
  p_restaurant uuid,
  p_date date,
  p_time time,
  p_party_size int,
  p_name text,
  p_email text,
  p_phone text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s public.restaurants;
  v_today date;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  select * into s from public.restaurants where id = p_restaurant;
  if not found then
    raise exception 'Restaurant introuvable.' using errcode = 'P0001';
  end if;
  v_today := (now() at time zone s.timezone)::date;

  if p_party_size is null or p_party_size < 1 or p_party_size > s.max_party_size then
    raise exception 'Nombre de couverts invalide (maximum %).', s.max_party_size using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 120 then
    raise exception 'Merci d''indiquer votre nom.' using errcode = 'P0001';
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'Une adresse e-mail valide est nécessaire pour vous prévenir.' using errcode = 'P0001';
  end if;
  if length(coalesce(p_phone, '')) > 40 then
    raise exception 'Champ trop long.' using errcode = 'P0001';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + s.booking_days_ahead then
    raise exception 'Date en dehors de la période de réservation.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.closures where restaurant_id = p_restaurant and date = p_date) then
    raise exception 'Le restaurant est fermé ce jour-là.' using errcode = 'P0001';
  end if;

  -- Une seule inscription active par personne et par date : on la met à jour.
  update public.waitlist
  set time = p_time, party_size = p_party_size, name = trim(p_name), phone = nullif(trim(p_phone), ''),
      status = 'waiting', notified_at = null
  where restaurant_id = p_restaurant and date = p_date and email = v_email and status in ('waiting', 'notified');
  if not found then
    insert into public.waitlist (restaurant_id, date, time, party_size, name, email, phone)
    values (p_restaurant, p_date, p_time, p_party_size, trim(p_name), v_email, nullif(trim(p_phone), ''));
  end if;
end;
$$;

-- Une réservation créée par une personne en liste d'attente la retire de la liste.
create or replace function public.close_waitlist_entry()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email is not null then
    update public.waitlist set status = 'booked'
    where restaurant_id = new.restaurant_id and date = new.date
      and email = lower(new.email) and status in ('waiting', 'notified');
  end if;
  return null;
end;
$$;

drop trigger if exists reservations_close_waitlist on public.reservations;
create trigger reservations_close_waitlist
  after insert on public.reservations
  for each row execute function public.close_waitlist_entry();

-- ─────────────────────────────────────────────────────────────
-- Réservation publique : renvoie aussi le lien de gestion
-- ─────────────────────────────────────────────────────────────

drop function if exists public.create_reservation(uuid, date, time, int, text, text, text, text);

create or replace function public.create_reservation(
  p_restaurant uuid,
  p_date date,
  p_time time,
  p_party_size int,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text
)
returns table (id uuid, status text, token text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  s public.restaurants;
  v_remaining int;
  v_status text;
  v_id uuid;
  v_token text;
  v_tables uuid[];
  v_duration int;
begin
  select * into s from public.restaurants where restaurants.id = p_restaurant;
  if not found then
    raise exception 'Restaurant introuvable.' using errcode = 'P0001';
  end if;

  if p_party_size is null or p_party_size < 1 or p_party_size > s.max_party_size then
    raise exception 'Nombre de couverts invalide (maximum %).', s.max_party_size using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 120 then
    raise exception 'Merci d''indiquer votre nom.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_email), '') = '' and coalesce(trim(p_phone), '') = '' then
    raise exception 'Merci d''indiquer un e-mail ou un téléphone.' using errcode = 'P0001';
  end if;
  if p_email is not null and trim(p_email) <> '' and p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide.' using errcode = 'P0001';
  end if;
  if length(coalesce(p_notes, '')) > 1000 or length(coalesce(p_phone, '')) > 40 then
    raise exception 'Champ trop long.' using errcode = 'P0001';
  end if;

  -- Sérialise les réservations d'un même restaurant et d'une même date.
  perform pg_advisory_xact_lock(hashtext('baresto:' || p_restaurant::text || ':' || p_date::text));

  select a.remaining into v_remaining
  from public.get_availability(p_restaurant, p_date, p_party_size) a
  where a.slot = p_time;

  if v_remaining is null then
    raise exception 'Ce créneau n''est pas disponible.' using errcode = 'P0001';
  end if;
  if v_remaining = 0 then
    raise exception 'Ce créneau est complet pour % personnes.', p_party_size using errcode = 'P0001';
  end if;
  if v_remaining < p_party_size then
    raise exception 'Plus assez de places sur ce créneau (% restantes).', v_remaining using errcode = 'P0001';
  end if;

  if exists (select 1 from public.dining_tables where restaurant_id = p_restaurant and bookable_online) then
    v_tables := public.find_tables(p_restaurant, p_date, p_time, p_party_size, true);
  end if;

  v_status := case when s.auto_confirm then 'confirmed' else 'pending' end;
  v_duration := public.meal_minutes(p_restaurant, p_time);

  insert into public.reservations
    (restaurant_id, date, time, party_size, name, email, phone, notes, status, source, duration_minutes)
  values (p_restaurant, p_date, p_time, p_party_size, trim(p_name), nullif(trim(p_email), ''),
          nullif(trim(p_phone), ''), nullif(trim(p_notes), ''), v_status, 'widget', v_duration)
  returning reservations.id, reservations.token into v_id, v_token;

  if v_tables is not null then
    insert into public.reservation_tables (reservation_id, table_id, restaurant_id, during)
    select v_id, t, p_restaurant, tsrange(p_date + p_time, p_date + p_time + make_interval(mins => v_duration))
    from unnest(v_tables) as t;
  end if;

  id := v_id;
  status := v_status;
  token := v_token;
  return next;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Gestion par le client (lien secret reçu par e-mail), jusqu'à 24 h avant
-- ─────────────────────────────────────────────────────────────

create or replace function public.reservation_deadline(p_restaurant uuid, p_date date, p_time time)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select ((p_date + p_time) at time zone timezone) - interval '24 hours'
  from public.restaurants where id = p_restaurant;
$$;

create or replace function public.get_reservation_by_token(p_token text)
returns table (
  id uuid, restaurant_id uuid, "date" date, "time" time, party_size int, duration_minutes int, name text,
  email text, phone text, notes text, status text, deadline timestamptz, can_modify boolean
)
language sql stable security definer set search_path = public
as $$
  select rv.id, rv.restaurant_id, rv.date, rv.time, rv.party_size, rv.duration_minutes, rv.name,
    rv.email, rv.phone, rv.notes, rv.status,
    d.deadline,
    rv.status in ('pending', 'confirmed') and now() <= d.deadline
  from public.reservations rv
  cross join lateral (select public.reservation_deadline(rv.restaurant_id, rv.date, rv.time) as deadline) d
  where length(p_token) >= 32 and rv.token = p_token;
$$;

-- Disponibilités pour déplacer une réservation : sa propre place est comptée comme libre.
-- Calcul dans une sous-transaction annulée aussitôt (rien n'est modifié).
create or replace function public.availability_for_token(p_token text, p_date date, p_party_size int)
returns table (slot time, remaining int)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  rv public.reservations;
  v_slots jsonb;
begin
  select * into rv from public.reservations where token = p_token and length(p_token) >= 32;
  if not found then
    return;
  end if;
  begin
    if rv.status in ('pending', 'confirmed') then
      update public.reservations set status = 'cancelled' where id = rv.id;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('slot', a.slot, 'remaining', a.remaining)), '[]'::jsonb)
    into v_slots
    from public.get_availability(rv.restaurant_id, p_date, p_party_size) a;
    raise exception 'annulation du calcul' using errcode = 'BR001';
  exception
    when sqlstate 'BR001' then null;
  end;
  return query
    select (e ->> 'slot')::time, (e ->> 'remaining')::int
    from jsonb_array_elements(v_slots) e
    order by 1;
end;
$$;

create or replace function public.cancel_reservation_by_token(p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  rv public.reservations;
begin
  select * into rv from public.reservations where token = p_token and length(p_token) >= 32 for update;
  if not found then
    raise exception 'Réservation introuvable.' using errcode = 'P0001';
  end if;
  if rv.status not in ('pending', 'confirmed') then
    raise exception 'Cette réservation ne peut plus être annulée.' using errcode = 'P0001';
  end if;
  if now() > public.reservation_deadline(rv.restaurant_id, rv.date, rv.time) then
    raise exception 'L''annulation en ligne est possible jusqu''à 24 h avant. Merci d''appeler le restaurant.'
      using errcode = 'P0001';
  end if;
  update public.reservations set status = 'cancelled' where id = rv.id;
end;
$$;

create or replace function public.modify_reservation_by_token(p_token text, p_date date, p_time time, p_party_size int)
returns text  -- nouveau statut
language plpgsql security definer set search_path = public
as $$
declare
  rv public.reservations;
  s public.restaurants;
  v_remaining int;
  v_status text;
  v_tables uuid[];
  v_duration int;
begin
  select * into rv from public.reservations where token = p_token and length(p_token) >= 32 for update;
  if not found then
    raise exception 'Réservation introuvable.' using errcode = 'P0001';
  end if;
  if rv.status not in ('pending', 'confirmed') then
    raise exception 'Cette réservation ne peut plus être modifiée.' using errcode = 'P0001';
  end if;
  if now() > public.reservation_deadline(rv.restaurant_id, rv.date, rv.time) then
    raise exception 'La modification en ligne est possible jusqu''à 24 h avant. Merci d''appeler le restaurant.'
      using errcode = 'P0001';
  end if;

  select * into s from public.restaurants where id = rv.restaurant_id;
  if p_party_size is null or p_party_size < 1 or p_party_size > s.max_party_size then
    raise exception 'Nombre de couverts invalide (maximum %).', s.max_party_size using errcode = 'P0001';
  end if;

  -- Verrous des deux dates, toujours dans le même ordre.
  perform pg_advisory_xact_lock(hashtext('baresto:' || rv.restaurant_id::text || ':' || least(rv.date, p_date)::text));
  if p_date <> rv.date then
    perform pg_advisory_xact_lock(hashtext('baresto:' || rv.restaurant_id::text || ':' || greatest(rv.date, p_date)::text));
  end if;

  -- Libère la place actuelle le temps du calcul (tout est annulé si le nouveau créneau est refusé).
  update public.reservations set status = 'cancelled' where id = rv.id;

  select a.remaining into v_remaining
  from public.get_availability(rv.restaurant_id, p_date, p_party_size) a
  where a.slot = p_time;
  if v_remaining is null then
    raise exception 'Ce créneau n''est pas disponible.' using errcode = 'P0001';
  end if;
  if v_remaining < p_party_size then
    raise exception 'Ce créneau est complet pour % personnes.', p_party_size using errcode = 'P0001';
  end if;

  if exists (select 1 from public.dining_tables where restaurant_id = rv.restaurant_id and bookable_online) then
    v_tables := public.find_tables(rv.restaurant_id, p_date, p_time, p_party_size, true);
  end if;

  v_status := case when s.auto_confirm then 'confirmed' else 'pending' end;
  v_duration := public.meal_minutes(rv.restaurant_id, p_time);

  update public.reservations
  set date = p_date, time = p_time, party_size = p_party_size, duration_minutes = v_duration,
      status = v_status, reminder_sent_at = null
  where id = rv.id;

  if v_tables is not null then
    insert into public.reservation_tables (reservation_id, table_id, restaurant_id, during)
    select rv.id, t, rv.restaurant_id, tsrange(p_date + p_time, p_date + p_time + make_interval(mins => v_duration))
    from unnest(v_tables) as t;
  end if;
  return v_status;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- E-mails programmés (appelés par /api/cron avec la clé secrète)
-- ─────────────────────────────────────────────────────────────

-- Rappels : réservations confirmées dans les 48 h, pas réservées à l'instant.
create or replace function public.due_reminders()
returns setof public.reservations
language sql stable security definer set search_path = public
as $$
  select rv.*
  from public.reservations rv
  join public.restaurants r on r.id = rv.restaurant_id
  where rv.status = 'confirmed' and rv.email is not null and rv.reminder_sent_at is null and r.send_reminders
    and rv.date between current_date - 1 and current_date + 3
    and ((rv.date + rv.time) at time zone r.timezone) between now() and now() + interval '48 hours'
    and rv.created_at < now() - interval '12 hours'
  limit 200;
$$;

-- Demandes d'avis : le lendemain du repas, à partir de 10 h (heure du restaurant).
create or replace function public.due_review_requests()
returns setof public.reservations
language sql stable security definer set search_path = public
as $$
  select rv.*
  from public.reservations rv
  join public.restaurants r on r.id = rv.restaurant_id
  where rv.status in ('confirmed', 'seated') and rv.email is not null and rv.review_requested_at is null
    and coalesce(trim(r.review_url), '') <> ''
    and rv.date between current_date - 4 and current_date
    and rv.date between (now() at time zone r.timezone)::date - 3 and (now() at time zone r.timezone)::date - 1
    and (now() at time zone r.timezone)::time >= '10:00'
  limit 200;
$$;

-- ─────────────────────────────────────────────────────────────
-- Droits et Row Level Security
-- ─────────────────────────────────────────────────────────────

revoke execute on function public.find_or_create_customer, public.link_customer, public.refresh_customer,
  public.reservations_refresh_customer, public.close_waitlist_entry, public.reservation_deadline,
  public.due_reminders, public.due_review_requests
  from public, anon, authenticated;
grant execute on function public.join_waitlist, public.get_reservation_by_token, public.availability_for_token,
  public.cancel_reservation_by_token, public.modify_reservation_by_token, public.create_reservation
  to anon, authenticated;
grant execute on function public.due_reminders, public.due_review_requests, public.get_availability
  to service_role;

grant select, insert, update, delete on public.customers, public.waitlist to authenticated;
grant all on public.customers, public.waitlist to service_role;

alter table public.customers enable row level security;
alter table public.waitlist enable row level security;

drop policy if exists "clients membres" on public.customers;
create policy "clients membres" on public.customers for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
drop policy if exists "liste d'attente membres" on public.waitlist;
create policy "liste d'attente membres" on public.waitlist for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

-- ─────────────────────────────────────────────────────────────
-- Temps réel : le back-office est prévenu des changements
-- ─────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['reservations', 'reservation_tables', 'waitlist'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
