-- Baresto — fermetures avec horaires, délai d'annulation réglable, règles anti-spam
--
-- À exécuter après 0003. Migration additive : aucune donnée n'est supprimée.

-- ─────────────────────────────────────────────────────────────
-- Délai d'annulation / modification en ligne, par restaurant (24 h par défaut)
-- ─────────────────────────────────────────────────────────────

alter table public.restaurants
  add column if not exists cancel_deadline_hours int not null default 24
    check (cancel_deadline_hours between 0 and 168);

create or replace function public.reservation_deadline(p_restaurant uuid, p_date date, p_time time)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select ((p_date + p_time) at time zone timezone) - make_interval(hours => cancel_deadline_hours)
  from public.restaurants where id = p_restaurant;
$$;

-- ─────────────────────────────────────────────────────────────
-- Fermetures : journée entière, ou seulement une plage horaire (un service, une soirée…)
-- ─────────────────────────────────────────────────────────────

alter table public.closures
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists start_time time,   -- null = dès l'ouverture
  add column if not exists end_time time;     -- null = jusqu'à la fermeture
update public.closures set id = gen_random_uuid() where id is null;
alter table public.closures alter column id set not null;

do $$
begin
  -- Plusieurs fermetures possibles le même jour (ex. midi + soirée privée) : nouvelle clé primaire.
  if exists (
    select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.closures'::regclass and c.contype = 'p' and a.attname = 'date'
  ) then
    alter table public.closures drop constraint closures_pkey;
    alter table public.closures add primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'closures_times_check') then
    alter table public.closures add constraint closures_times_check
      check (start_time is null or end_time is null or start_time < end_time);
  end if;
end $$;
create index if not exists closures_restaurant_date_idx on public.closures (restaurant_id, date);

-- Créneaux réservables : un créneau est fermé si son heure d'arrivée tombe dans une fermeture.
create or replace function public.get_availability(p_restaurant uuid, p_date date, p_party_size int default 1)
returns table (slot time, remaining int)
language sql stable security definer set search_path = public
as $$
  with s as (select * from public.restaurants where id = p_restaurant),
  local_now as (select (now() at time zone s.timezone) as ts from s),
  has_tables as (
    select exists (select 1 from public.dining_tables where restaurant_id = p_restaurant and bookable_online) as v
  ),
  slots as (
    select distinct g::time as slot
    from s,
      jsonb_array_elements(coalesce(s.opening_hours -> extract(dow from p_date)::int::text, '[]'::jsonb)) r,
      generate_series(
        p_date + (r ->> 'start')::time,
        p_date + (r ->> 'end')::time,
        make_interval(mins => s.slot_minutes)
      ) g
  ),
  booked as (
    select rv."time" as slot, sum(rv.party_size)::int as covers
    from public.reservations rv
    where rv.restaurant_id = p_restaurant and rv.date = p_date
      and rv.status in ('pending', 'confirmed', 'seated')
    group by rv."time"
  )
  select sl.slot,
    case
      when ht.v and public.find_tables(p_restaurant, p_date, sl.slot, greatest(p_party_size, 1), true) is null then 0
      else greatest(s.max_covers_per_slot - coalesce(b.covers, 0), 0)
    end
  from slots sl
  cross join s
  cross join local_now n
  cross join has_tables ht
  left join booked b on b.slot = sl.slot
  where not exists (
      select 1 from public.closures c
      where c.restaurant_id = p_restaurant and c.date = p_date
        and sl.slot >= coalesce(c.start_time, '00:00'::time)
        and (c.end_time is null or sl.slot < c.end_time)
    )
    and p_date between n.ts::date and n.ts::date + s.booking_days_ahead
    and p_date + sl.slot >= n.ts + make_interval(mins => s.min_notice_minutes)
  order by sl.slot;
$$;

-- ─────────────────────────────────────────────────────────────
-- Anti-spam : une réservation par personne et par jour, 5 réservations à venir au maximum
-- ─────────────────────────────────────────────────────────────

create or replace function public.check_reservation_spam(
  p_restaurant uuid, p_date date, p_email text, p_phone text, p_exclude uuid default null
)
returns void
language plpgsql stable security definer set search_path = public
as $$
declare
  v_email text := lower(nullif(trim(p_email), ''));
  v_key text := public.phone_key(p_phone);
  v_today date;
begin
  if v_email is null and v_key is null then
    return;
  end if;
  select (now() at time zone timezone)::date into v_today from public.restaurants where id = p_restaurant;

  if exists (
    select 1 from public.reservations
    where restaurant_id = p_restaurant and date = p_date
      and status in ('pending', 'confirmed', 'seated')
      and id is distinct from p_exclude
      and (lower(email) = v_email or public.phone_key(phone) = v_key)
  ) then
    raise exception 'Vous avez déjà une réservation ce jour-là. Pour la changer, utilisez le lien reçu par e-mail.'
      using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.reservations
    where restaurant_id = p_restaurant and date >= v_today
      and status in ('pending', 'confirmed')
      and id is distinct from p_exclude
      and (lower(email) = v_email or public.phone_key(phone) = v_key)
  ) >= 5 then
    raise exception 'Vous avez déjà 5 réservations à venir dans ce restaurant. Merci de l''appeler directement.'
      using errcode = 'P0001';
  end if;
end;
$$;

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
  if coalesce(trim(p_phone), '') <> '' and public.phone_key(p_phone) is null then
    raise exception 'Numéro de téléphone invalide.' using errcode = 'P0001';
  end if;
  if length(coalesce(p_notes, '')) > 1000 or length(coalesce(p_phone, '')) > 40 or length(coalesce(p_email, '')) > 200 then
    raise exception 'Champ trop long.' using errcode = 'P0001';
  end if;

  -- Sérialise les réservations d'un même restaurant et d'une même date.
  perform pg_advisory_xact_lock(hashtext('baresto:' || p_restaurant::text || ':' || p_date::text));

  perform public.check_reservation_spam(p_restaurant, p_date, p_email, p_phone);

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
-- Gestion par le client : délai propre au restaurant
-- ─────────────────────────────────────────────────────────────

create or replace function public.cancel_reservation_by_token(p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  rv public.reservations;
  v_hours int;
begin
  select * into rv from public.reservations where token = p_token and length(p_token) >= 32 for update;
  if not found then
    raise exception 'Réservation introuvable.' using errcode = 'P0001';
  end if;
  if rv.status not in ('pending', 'confirmed') then
    raise exception 'Cette réservation ne peut plus être annulée.' using errcode = 'P0001';
  end if;
  if now() > public.reservation_deadline(rv.restaurant_id, rv.date, rv.time) then
    select cancel_deadline_hours into v_hours from public.restaurants where id = rv.restaurant_id;
    raise exception 'L''annulation en ligne est possible jusqu''à % h avant. Merci d''appeler le restaurant.', v_hours
      using errcode = 'P0001';
  end if;
  update public.reservations set status = 'cancelled' where id = rv.id;
end;
$$;

create or replace function public.modify_reservation_by_token(p_token text, p_date date, p_time time, p_party_size int)
returns text
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
  select * into s from public.restaurants where id = rv.restaurant_id;
  if now() > public.reservation_deadline(rv.restaurant_id, rv.date, rv.time) then
    raise exception 'La modification en ligne est possible jusqu''à % h avant. Merci d''appeler le restaurant.',
      s.cancel_deadline_hours using errcode = 'P0001';
  end if;
  if p_party_size is null or p_party_size < 1 or p_party_size > s.max_party_size then
    raise exception 'Nombre de couverts invalide (maximum %).', s.max_party_size using errcode = 'P0001';
  end if;

  -- Verrous des deux dates, toujours dans le même ordre.
  perform pg_advisory_xact_lock(hashtext('baresto:' || rv.restaurant_id::text || ':' || least(rv.date, p_date)::text));
  if p_date <> rv.date then
    perform pg_advisory_xact_lock(hashtext('baresto:' || rv.restaurant_id::text || ':' || greatest(rv.date, p_date)::text));
  end if;

  perform public.check_reservation_spam(rv.restaurant_id, p_date, rv.email, rv.phone, rv.id);

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
-- Liste d'attente : seulement les jours fermés en entier, 3 inscriptions actives par personne
-- ─────────────────────────────────────────────────────────────

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
  if exists (
    select 1 from public.closures
    where restaurant_id = p_restaurant and date = p_date and start_time is null and end_time is null
  ) then
    raise exception 'Le restaurant est fermé ce jour-là.' using errcode = 'P0001';
  end if;

  update public.waitlist
  set time = p_time, party_size = p_party_size, name = trim(p_name), phone = nullif(trim(p_phone), ''),
      status = 'waiting', notified_at = null
  where restaurant_id = p_restaurant and date = p_date and email = v_email and status in ('waiting', 'notified');
  if not found then
    if (
      select count(*) from public.waitlist
      where restaurant_id = p_restaurant and email = v_email and status in ('waiting', 'notified') and date >= v_today
    ) >= 3 then
      raise exception 'Vous êtes déjà sur 3 listes d''attente dans ce restaurant.' using errcode = 'P0001';
    end if;
    insert into public.waitlist (restaurant_id, date, time, party_size, name, email, phone)
    values (p_restaurant, p_date, p_time, p_party_size, trim(p_name), v_email, nullif(trim(p_phone), ''));
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────

revoke execute on function public.check_reservation_spam from public, anon, authenticated;
revoke execute on function public.reservation_deadline from public, anon, authenticated;
revoke execute on function public.phone_key from public, anon;
grant execute on function public.get_availability, public.create_reservation, public.join_waitlist,
  public.cancel_reservation_by_token, public.modify_reservation_by_token to anon, authenticated;
grant execute on function public.get_availability to service_role;
