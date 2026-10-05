-- Baresto — schéma initial
-- À exécuter dans Supabase (SQL Editor) ou via `supabase db push`.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Mon Restaurant',
  tagline text,
  logo_url text,
  primary_color text not null default '#b45309',
  phone text,
  email text,
  address text,
  timezone text not null default 'Europe/Paris',
  currency text not null default 'EUR',
  -- Clés "0" (dimanche) à "6" (samedi) → [{ "start": "12:00", "end": "14:00" }]
  -- "end" = dernière heure d'arrivée réservable.
  opening_hours jsonb not null default '{}'::jsonb,
  slot_minutes int not null default 30 check (slot_minutes between 5 and 240),
  max_covers_per_slot int not null default 20 check (max_covers_per_slot > 0),
  max_party_size int not null default 8 check (max_party_size > 0),
  booking_days_ahead int not null default 60 check (booking_days_ahead between 0 and 365),
  min_notice_minutes int not null default 60 check (min_notice_minutes >= 0),
  auto_confirm boolean not null default false,
  reservation_message text
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2),
  image_url text,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id, position);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time time not null,
  party_size int not null check (party_size > 0),
  name text not null,
  email text,
  phone text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'seated', 'cancelled', 'no_show')),
  source text not null default 'widget' check (source in ('widget', 'admin')),
  created_at timestamptz not null default now()
);
create index reservations_date_idx on public.reservations (date, time);

create table public.closures (
  date date primary key,
  reason text
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ─────────────────────────────────────────────────────────────
-- Fonctions
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Le tout premier compte créé devient administrateur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.admins) then
    insert into public.admins (user_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Créneaux réservables d'une date, avec places restantes.
create or replace function public.get_availability(p_date date)
returns table (slot time, remaining int)
language sql stable security definer set search_path = public
as $$
  with s as (select * from public.settings where id = 1),
  local_now as (select (now() at time zone s.timezone) as ts from s),
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
    where rv.date = p_date and rv.status in ('pending', 'confirmed', 'seated')
    group by rv."time"
  )
  select sl.slot, greatest(s.max_covers_per_slot - coalesce(b.covers, 0), 0)
  from slots sl
  cross join s
  cross join local_now n
  left join booked b on b.slot = sl.slot
  where not exists (select 1 from public.closures c where c.date = p_date)
    and p_date between n.ts::date and n.ts::date + s.booking_days_ahead
    and p_date + sl.slot >= n.ts + make_interval(mins => s.min_notice_minutes)
  order by sl.slot;
$$;

-- Création d'une réservation publique, validée côté base (capacité, horaires).
create or replace function public.create_reservation(
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
  s public.settings;
  v_remaining int;
  v_status text;
  v_id uuid;
begin
  select * into s from public.settings where settings.id = 1;

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

  -- Sérialise les réservations d'une même date pour éviter le surbooking.
  perform pg_advisory_xact_lock(hashtext('baresto:' || p_date::text));

  select a.remaining into v_remaining
  from public.get_availability(p_date) a
  where a.slot = p_time;

  if v_remaining is null then
    raise exception 'Ce créneau n''est pas disponible.' using errcode = 'P0001';
  end if;
  if v_remaining < p_party_size then
    raise exception 'Plus assez de places sur ce créneau (% restantes).', v_remaining using errcode = 'P0001';
  end if;

  v_status := case when s.auto_confirm then 'confirmed' else 'pending' end;

  insert into public.reservations (date, time, party_size, name, email, phone, notes, status, source)
  values (p_date, p_time, p_party_size, trim(p_name), nullif(trim(p_email), ''),
          nullif(trim(p_phone), ''), nullif(trim(p_notes), ''), v_status, 'widget')
  returning reservations.id into v_id;

  id := v_id;
  status := v_status;
  return next;
end;
$$;

revoke execute on function public.handle_new_user from public, anon, authenticated;
revoke execute on function public.create_reservation from public;
grant execute on function public.get_availability to anon, authenticated;
grant execute on function public.create_reservation to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Droits (filtrés ensuite par les règles RLS)
-- ─────────────────────────────────────────────────────────────

grant select on public.settings, public.menu_categories, public.menu_items, public.closures
  to anon, authenticated;
grant update on public.settings to authenticated;
grant insert, update, delete on public.menu_categories, public.menu_items, public.closures
  to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;
grant select on public.admins to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.reservations enable row level security;
alter table public.closures enable row level security;
alter table public.admins enable row level security;

create policy "settings lisibles" on public.settings for select using (true);
create policy "settings admin" on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "catégories visibles" on public.menu_categories for select
  using (is_visible or public.is_admin());
create policy "catégories admin" on public.menu_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "plats visibles" on public.menu_items for select
  using (
    public.is_admin()
    or exists (select 1 from public.menu_categories c where c.id = category_id and c.is_visible)
  );
create policy "plats admin" on public.menu_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "réservations admin" on public.reservations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "fermetures lisibles" on public.closures for select using (true);
create policy "fermetures admin" on public.closures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admin voit son statut" on public.admins for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Stockage des photos de la carte
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do nothing;

create policy "photos carte admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and public.is_admin());
create policy "photos carte admin update" on storage.objects for update to authenticated
  using (bucket_id = 'menu' and public.is_admin());
create policy "photos carte admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Données de départ
-- ─────────────────────────────────────────────────────────────

insert into public.settings (id, name, tagline, opening_hours)
values (
  1,
  'Mon Restaurant',
  'Cuisine de saison, fait maison',
  '{
    "0": [],
    "1": [],
    "2": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "21:30"}],
    "3": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "21:30"}],
    "4": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "21:30"}],
    "5": [{"start": "12:00", "end": "13:30"}, {"start": "19:00", "end": "22:00"}],
    "6": [{"start": "12:00", "end": "14:00"}, {"start": "19:00", "end": "22:00"}]
  }'::jsonb
);

with cats as (
  insert into public.menu_categories (name, position) values
    ('Entrées', 0), ('Plats', 1), ('Desserts', 2), ('Boissons', 3)
  returning id, name
)
insert into public.menu_items (category_id, name, description, price, tags, allergens, position)
select c.id, i.name, i.description, i.price, i.tags, i.allergens, i.position
from cats c
join (values
  ('Entrées', 'Velouté de saison', 'Légumes du marché, crème crue', 9.00, '{végétarien}'::text[], '{lait}'::text[], 0),
  ('Entrées', 'Terrine maison', 'Pickles et pain de campagne', 11.00, '{}', '{gluten,moutarde}', 1),
  ('Plats', 'Burger du chef', 'Bœuf français, cheddar affiné, frites maison', 19.00, '{}', '{gluten,lait,moutarde}', 0),
  ('Plats', 'Risotto aux champignons', 'Parmesan, huile de truffe', 18.00, '{végétarien}', '{lait}', 1),
  ('Plats', 'Poisson du jour', 'Selon arrivage, beurre blanc', 22.00, '{}', '{poisson,lait}', 2),
  ('Desserts', 'Moelleux chocolat', 'Cœur coulant, glace vanille', 8.00, '{végétarien}', '{gluten,lait,oeufs}', 0),
  ('Desserts', 'Café gourmand', 'Trois mignardises', 9.00, '{}', '{gluten,lait,oeufs,fruits à coque}', 1),
  ('Boissons', 'Limonade artisanale', '33 cl', 4.50, '{vegan}', '{}', 0),
  ('Boissons', 'Verre de vin rouge', 'Sélection du moment, 12 cl', 6.00, '{vegan}', '{sulfites}', 1)
) as i(cat, name, description, price, tags, allergens, position) on i.cat = c.name;
