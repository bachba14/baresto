-- Baresto — passage en SaaS multi-restaurants (avec plan de salle)
--
-- ⚠️ Remplace le schéma mono-restaurant de 0001 : les tables de 0001 sont supprimées
-- (carte d'exemple et réservations de test comprises).

-- ─────────────────────────────────────────────────────────────
-- Nettoyage du schéma 0001
-- ─────────────────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
drop policy if exists "photos carte admin insert" on storage.objects;
drop policy if exists "photos carte admin update" on storage.objects;
drop policy if exists "photos carte admin delete" on storage.objects;
-- Tables de 0001 et, si elle a été appliquée, de l'ancienne migration « plan de salle ».
drop table if exists public.reservation_tables, public.dining_tables, public.rooms,
  public.reservations, public.closures, public.menu_items,
  public.menu_categories, public.settings, public.admins cascade;
drop function if exists public.create_reservation(date, time, int, text, text, text, text);
drop function if exists public.get_availability(date);
drop function if exists public.get_availability(date, int);
drop function if exists public.find_tables(date, time, int, boolean, uuid);
drop function if exists public.assign_tables(uuid, uuid[]);
drop function if exists public.auto_assign(uuid);
drop function if exists public.meal_minutes(time);
drop function if exists public.set_reservation_duration();
drop function if exists public.release_tables();
drop function if exists public.handle_new_user();
drop function if exists public.is_admin();

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Restaurants et membres
-- ─────────────────────────────────────────────────────────────

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  name text not null,
  tagline text,
  cuisine text,
  logo_url text,
  primary_color text not null default '#b45309',
  phone text,
  email text,
  address text,
  city text,
  timezone text not null default 'Europe/Paris',
  currency text not null default 'EUR',
  -- Clés "0" (dimanche) à "6" (samedi) → [{ "start": "12:00", "end": "14:00" }]
  -- "end" = dernière heure d'arrivée réservable.
  opening_hours jsonb not null default '{
    "0": [], "1": [],
    "2": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "21:30"}],
    "3": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "21:30"}],
    "4": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "21:30"}],
    "5": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "22:00"}],
    "6": [{"start": "12:00", "end": "14:00"}, {"start": "19:00", "end": "22:00"}]
  }'::jsonb,
  slot_minutes int not null default 30 check (slot_minutes between 5 and 240),
  max_covers_per_slot int not null default 30 check (max_covers_per_slot > 0),
  max_party_size int not null default 8 check (max_party_size > 0),
  booking_days_ahead int not null default 60 check (booking_days_ahead between 0 and 365),
  min_notice_minutes int not null default 60 check (min_notice_minutes >= 0),
  auto_confirm boolean not null default true,
  reservation_message text,
  lunch_minutes int not null default 90 check (lunch_minutes between 15 and 480),
  dinner_minutes int not null default 120 check (dinner_minutes between 15 and 480),
  dinner_from time not null default '16:00',
  onboarding_completed boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_members_user_idx on public.restaurant_members (user_id);

create or replace function public.is_member(p_restaurant uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = p_restaurant and user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Carte
-- ─────────────────────────────────────────────────────────────

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index menu_categories_restaurant_idx on public.menu_categories (restaurant_id, position);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text,
  price numeric(10, 2),
  image_url text,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  -- Garantit que le plat et sa catégorie appartiennent au même restaurant.
  foreign key (category_id, restaurant_id)
    references public.menu_categories (id, restaurant_id) on delete cascade
);
create index menu_items_category_idx on public.menu_items (category_id, position);

-- ─────────────────────────────────────────────────────────────
-- Salles et tables
-- ─────────────────────────────────────────────────────────────

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  width numeric not null default 12 check (width between 2 and 100),  -- mètres
  depth numeric not null default 8 check (depth between 2 and 100),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id)
);

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  room_id uuid not null,
  label text not null,
  seats int not null check (seats between 1 and 30),
  min_seats int not null default 1 check (min_seats >= 1),
  shape text not null default 'square' check (shape in ('round', 'square', 'rect')),
  x numeric not null default 1,          -- centre de la table, en mètres
  y numeric not null default 1,
  rotation numeric not null default 0,   -- degrés
  combine_group text,                    -- tables d'un même groupe peuvent être collées
  bookable_online boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, restaurant_id),
  foreign key (room_id, restaurant_id) references public.rooms (id, restaurant_id) on delete cascade
);
create index dining_tables_restaurant_idx on public.dining_tables (restaurant_id);

-- ─────────────────────────────────────────────────────────────
-- Réservations
-- ─────────────────────────────────────────────────────────────

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  date date not null,
  time time not null,
  party_size int not null check (party_size > 0),
  duration_minutes int check (duration_minutes > 0),
  name text not null,
  email text,
  phone text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'seated', 'cancelled', 'no_show')),
  source text not null default 'widget' check (source in ('widget', 'admin')),
  created_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index reservations_restaurant_date_idx on public.reservations (restaurant_id, date, time);

create table public.reservation_tables (
  reservation_id uuid not null,
  table_id uuid not null,
  restaurant_id uuid not null,
  during tsrange not null,
  primary key (reservation_id, table_id),
  -- Réservation et table du même restaurant.
  foreign key (reservation_id, restaurant_id) references public.reservations (id, restaurant_id) on delete cascade,
  foreign key (table_id, restaurant_id) references public.dining_tables (id, restaurant_id) on delete cascade,
  -- Une table ne peut jamais être occupée deux fois au même moment.
  constraint reservation_tables_no_overlap exclude using gist (table_id with =, during with &&)
);
create index reservation_tables_restaurant_idx on public.reservation_tables (restaurant_id);

create table public.closures (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  date date not null,
  reason text,
  primary key (restaurant_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- Fonctions
-- ─────────────────────────────────────────────────────────────

create or replace function public.meal_minutes(p_restaurant uuid, p_time time)
returns int
language sql stable security definer set search_path = public
as $$
  select case when p_time >= dinner_from then dinner_minutes else lunch_minutes end
  from public.restaurants where id = p_restaurant;
$$;

create or replace function public.set_reservation_duration()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.duration_minutes := coalesce(new.duration_minutes, public.meal_minutes(new.restaurant_id, new.time));
  return new;
end;
$$;

create trigger reservations_set_duration
  before insert on public.reservations
  for each row execute function public.set_reservation_duration();

-- Une réservation annulée, non venue ou déplacée libère ses tables.
create or replace function public.release_tables()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status in ('cancelled', 'no_show')
     or new.date is distinct from old.date
     or new.time is distinct from old.time
     or new.duration_minutes is distinct from old.duration_minutes then
    delete from public.reservation_tables where reservation_id = new.id;
  end if;
  return new;
end;
$$;

create trigger reservations_release_tables
  after update on public.reservations
  for each row execute function public.release_tables();

-- Meilleure table libre (ou paire de tables combinables) pour un groupe.
-- Priorité : une seule table, la plus petite possible.
create or replace function public.find_tables(
  p_restaurant uuid,
  p_date date,
  p_time time,
  p_party int,
  p_online_only boolean,
  p_exclude_reservation uuid default null
)
returns uuid[]
language sql stable security definer set search_path = public
as $$
  with win as (
    select tsrange(p_date + p_time, p_date + p_time + make_interval(mins => public.meal_minutes(p_restaurant, p_time))) as r
  ),
  free as (
    select t.*
    from public.dining_tables t, win
    where t.restaurant_id = p_restaurant
      and (not p_online_only or t.bookable_online)
      and not exists (
        select 1 from public.reservation_tables rt
        where rt.table_id = t.id
          and rt.during && win.r
          and rt.reservation_id is distinct from p_exclude_reservation
      )
  ),
  candidates as (
    select array[f.id] as ids, f.seats as seats, 0 as n
    from free f
    where f.seats >= p_party and f.min_seats <= p_party
    union all
    select array[a.id, b.id], a.seats + b.seats, 1
    from free a
    join free b on a.combine_group = b.combine_group and a.id < b.id
    where a.seats + b.seats >= p_party and a.seats < p_party and b.seats < p_party
  )
  select ids from candidates order by n, seats limit 1;
$$;

-- Créneaux réservables d'une date pour un groupe, avec places restantes.
-- Sans table réservable en ligne, seule la limite de couverts par créneau s'applique.
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
  where not exists (select 1 from public.closures c where c.restaurant_id = p_restaurant and c.date = p_date)
    and p_date between n.ts::date and n.ts::date + s.booking_days_ahead
    and p_date + sl.slot >= n.ts + make_interval(mins => s.min_notice_minutes)
  order by sl.slot;
$$;

-- Réservation publique, validée côté base (capacité, horaires, tables).
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
returns table (id uuid, status text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  s public.restaurants;
  v_remaining int;
  v_status text;
  v_id uuid;
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
  returning reservations.id into v_id;

  if v_tables is not null then
    insert into public.reservation_tables (reservation_id, table_id, restaurant_id, during)
    select v_id, t, p_restaurant, tsrange(p_date + p_time, p_date + p_time + make_interval(mins => v_duration))
    from unnest(v_tables) as t;
  end if;

  id := v_id;
  status := v_status;
  return next;
end;
$$;

-- Affecte une réservation à des tables (membre du restaurant). Liste vide = retirer le placement.
create or replace function public.assign_tables(p_reservation uuid, p_tables uuid[])
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  r public.reservations;
begin
  select * into r from public.reservations where id = p_reservation;
  if not found or not public.is_member(r.restaurant_id) then
    raise exception 'Réservation introuvable.' using errcode = 'P0001';
  end if;

  delete from public.reservation_tables where reservation_id = p_reservation;
  if coalesce(array_length(p_tables, 1), 0) > 0 then
    insert into public.reservation_tables (reservation_id, table_id, restaurant_id, during)
    select p_reservation, t, r.restaurant_id,
      tsrange(r.date + r.time, r.date + r.time + make_interval(mins => r.duration_minutes))
    from unnest(p_tables) as t;
  end if;
exception
  when exclusion_violation then
    raise exception 'Cette table est déjà occupée sur ce créneau.' using errcode = 'P0001';
end;
$$;

-- Placement automatique d'une réservation existante. Renvoie les tables choisies.
create or replace function public.auto_assign(p_reservation uuid)
returns uuid[]
language plpgsql security definer set search_path = public
as $$
declare
  r public.reservations;
  v_tables uuid[];
begin
  select * into r from public.reservations where id = p_reservation;
  if not found or not public.is_member(r.restaurant_id) then return null; end if;
  v_tables := public.find_tables(r.restaurant_id, r.date, r.time, r.party_size, false, p_reservation);
  if v_tables is not null then
    perform public.assign_tables(p_reservation, v_tables);
  end if;
  return v_tables;
end;
$$;

-- Création d'un restaurant par un utilisateur inscrit (il en devient propriétaire).
create or replace function public.create_restaurant(p_name text, p_slug text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.restaurant_members where user_id = auth.uid()) then
    raise exception 'Vous avez déjà un restaurant.' using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_name)), 0) < 2 then
    raise exception 'Nom du restaurant trop court.' using errcode = 'P0001';
  end if;
  if p_slug !~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$' then
    raise exception 'Adresse invalide : lettres minuscules, chiffres et tirets (3 caractères minimum).' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.restaurants where slug = p_slug) then
    raise exception 'Cette adresse est déjà prise.' using errcode = 'P0001';
  end if;

  insert into public.restaurants (name, slug, created_by)
  values (trim(p_name), p_slug, auth.uid())
  returning id into v_id;
  insert into public.restaurant_members (restaurant_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end;
$$;

-- Carte d'exemple, pour démarrer vite (membre du restaurant).
create or replace function public.seed_example_menu(p_restaurant uuid)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  if not public.is_member(p_restaurant) then
    raise exception 'Accès refusé.' using errcode = 'P0001';
  end if;

  with cats as (
    insert into public.menu_categories (restaurant_id, name, position) values
      (p_restaurant, 'Entrées', 0), (p_restaurant, 'Plats', 1), (p_restaurant, 'Desserts', 2)
    returning id, name
  )
  insert into public.menu_items (restaurant_id, category_id, name, description, price, tags, allergens, position)
  select p_restaurant, c.id, i.name, i.description, i.price, i.tags, i.allergens, i.position
  from cats c
  join (values
    ('Entrées', 'Velouté de saison', 'Légumes du marché, crème crue', 9.00, '{végétarien}'::text[], '{lait}'::text[], 0),
    ('Entrées', 'Terrine maison', 'Pickles et pain de campagne', 11.00, '{}', '{gluten,moutarde}', 1),
    ('Plats', 'Burger du chef', 'Bœuf français, cheddar affiné, frites maison', 19.00, '{}', '{gluten,lait,moutarde}', 0),
    ('Plats', 'Risotto aux champignons', 'Parmesan, huile de truffe', 18.00, '{végétarien}', '{lait}', 1),
    ('Desserts', 'Moelleux chocolat', 'Cœur coulant, glace vanille', 8.00, '{végétarien}', '{gluten,lait,oeufs}', 0)
  ) as i(cat, name, description, price, tags, allergens, position) on i.cat = c.name;
end;
$$;

-- Droits d'exécution
revoke execute on function public.set_reservation_duration from public, anon, authenticated;
revoke execute on function public.release_tables from public, anon, authenticated;
revoke execute on function public.find_tables from public, anon, authenticated;
revoke execute on function public.meal_minutes from public, anon, authenticated;
revoke execute on function public.assign_tables from public, anon;
revoke execute on function public.auto_assign from public, anon;
revoke execute on function public.create_restaurant from public, anon;
revoke execute on function public.seed_example_menu from public, anon;
grant execute on function public.assign_tables, public.auto_assign, public.create_restaurant,
  public.seed_example_menu to authenticated;
grant execute on function public.get_availability, public.create_reservation, public.is_member
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Droits et Row Level Security
-- ─────────────────────────────────────────────────────────────

grant select on public.restaurants, public.menu_categories, public.menu_items, public.closures
  to anon, authenticated;
grant update on public.restaurants to authenticated;
grant select on public.restaurant_members to authenticated;
grant insert, update, delete on public.menu_categories, public.menu_items, public.closures,
  public.rooms, public.dining_tables, public.reservation_tables to authenticated;
grant select on public.rooms, public.dining_tables, public.reservation_tables to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;

alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.rooms enable row level security;
alter table public.dining_tables enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_tables enable row level security;
alter table public.closures enable row level security;

create policy "restaurants publics" on public.restaurants for select using (true);
create policy "restaurants membres" on public.restaurants for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));

create policy "membres : voir ses équipes" on public.restaurant_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(restaurant_id));

create policy "catégories visibles" on public.menu_categories for select
  using (is_visible or public.is_member(restaurant_id));
create policy "catégories membres" on public.menu_categories for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

create policy "plats visibles" on public.menu_items for select
  using (
    public.is_member(restaurant_id)
    or exists (select 1 from public.menu_categories c where c.id = category_id and c.is_visible)
  );
create policy "plats membres" on public.menu_items for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

create policy "fermetures publiques" on public.closures for select using (true);
create policy "fermetures membres" on public.closures for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

create policy "salles membres" on public.rooms for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
create policy "tables membres" on public.dining_tables for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
create policy "réservations membres" on public.reservations for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
create policy "placements membres" on public.reservation_tables for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

-- ─────────────────────────────────────────────────────────────
-- Photos de la carte : dossier = id du restaurant
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do nothing;

create policy "photos carte membres insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "photos carte membres update" on storage.objects for update to authenticated
  using (bucket_id = 'menu' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "photos carte membres delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and public.is_member(((storage.foldername(name))[1])::uuid));

-- ─────────────────────────────────────────────────────────────
-- Restaurant de démonstration (/r/demo, utilisé par la landing page)
-- ─────────────────────────────────────────────────────────────

do $$
declare
  v_id uuid;
  v_salle uuid;
  v_terrasse uuid;
begin
  insert into public.restaurants (slug, name, tagline, cuisine, phone, address, city, auto_confirm, onboarding_completed,
    opening_hours)
  values ('demo', 'Le Comptoir', 'Bistrot de saison, fait maison', 'Bistrot', '01 23 45 67 89',
    '12 rue des Halles', 'Paris', true, true,
    (select jsonb_object_agg(d::text, '[{"start":"12:00","end":"14:00"},{"start":"19:00","end":"22:00"}]'::jsonb)
     from generate_series(0, 6) d))
  returning id into v_id;

  with cats as (
    insert into public.menu_categories (restaurant_id, name, position) values
      (v_id, 'Entrées', 0), (v_id, 'Plats', 1), (v_id, 'Desserts', 2), (v_id, 'Boissons', 3)
    returning id, name
  )
  insert into public.menu_items (restaurant_id, category_id, name, description, price, tags, allergens, position)
  select v_id, c.id, i.name, i.description, i.price, i.tags, i.allergens, i.position
  from cats c
  join (values
    ('Entrées', 'Velouté de saison', 'Légumes du marché, crème crue', 9.00, '{végétarien}'::text[], '{lait}'::text[], 0),
    ('Entrées', 'Œuf parfait', 'Crème de champignons, noisettes torréfiées', 12.00, '{végétarien}', '{oeufs,lait,fruits à coque}', 1),
    ('Plats', 'Burger du chef', 'Bœuf français, cheddar affiné, frites maison', 19.00, '{}', '{gluten,lait,moutarde}', 0),
    ('Plats', 'Risotto aux cèpes', 'Parmesan 24 mois, huile de truffe', 21.00, '{végétarien}', '{lait}', 1),
    ('Plats', 'Poisson du jour', 'Selon arrivage, beurre blanc', 23.00, '{}', '{poisson,lait}', 2),
    ('Desserts', 'Moelleux chocolat', 'Cœur coulant, glace vanille', 8.00, '{végétarien}', '{gluten,lait,oeufs}', 0),
    ('Desserts', 'Tarte fine aux pommes', 'Caramel au beurre salé', 9.00, '{végétarien}', '{gluten,lait}', 1),
    ('Boissons', 'Limonade artisanale', '33 cl', 4.50, '{vegan}', '{}', 0),
    ('Boissons', 'Verre de vin rouge', 'Sélection du moment, 12 cl', 6.00, '{vegan}', '{sulfites}', 1)
  ) as i(cat, name, description, price, tags, allergens, position) on i.cat = c.name;

  insert into public.rooms (restaurant_id, name, width, depth, position) values (v_id, 'Salle', 12, 8, 0)
  returning id into v_salle;
  insert into public.rooms (restaurant_id, name, width, depth, position) values (v_id, 'Terrasse', 9, 4, 1)
  returning id into v_terrasse;

  insert into public.dining_tables (restaurant_id, room_id, label, seats, min_seats, shape, x, y, rotation, combine_group, bookable_online)
  select v_id, case when t.room = 'S' then v_salle else v_terrasse end,
    t.label, t.seats, t.min_seats, t.shape, t.x, t.y, t.rotation, t.grp, t.online
  from (values
    ('S', 'T1', 2, 1, 'round', 1.5, 1.3, 0, null, true),
    ('S', 'T2', 2, 1, 'round', 3.5, 1.3, 0, null, true),
    ('S', 'T3', 2, 1, 'round', 5.5, 1.3, 0, null, true),
    ('S', 'T4', 2, 1, 'round', 7.5, 1.3, 0, null, true),
    ('S', 'T5', 4, 3, 'square', 1.8, 4.2, 0, 'A', true),
    ('S', 'T6', 4, 3, 'square', 3.0, 4.2, 0, 'A', true),
    ('S', 'T7', 4, 3, 'square', 5.6, 4.2, 0, 'B', true),
    ('S', 'T8', 4, 3, 'square', 6.8, 4.2, 0, 'B', true),
    ('S', 'T9', 6, 4, 'rect', 10.3, 2.2, 90, null, true),
    ('S', 'T10', 8, 5, 'rect', 10.3, 5.8, 90, null, false),
    ('S', 'T11', 4, 2, 'round', 3.0, 6.6, 0, null, true),
    ('S', 'T12', 4, 2, 'round', 6.2, 6.6, 0, null, true),
    ('E', 'E1', 2, 1, 'square', 1.2, 1.2, 0, 'E', true),
    ('E', 'E2', 2, 1, 'square', 2.4, 1.2, 0, 'E', true),
    ('E', 'E3', 4, 2, 'round', 5.0, 2.0, 0, null, true),
    ('E', 'E4', 4, 2, 'round', 7.5, 2.0, 0, null, false)
  ) as t(room, label, seats, min_seats, shape, x, y, rotation, grp, online);
end $$;
