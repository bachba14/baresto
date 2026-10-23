-- Monkomi — équipe : administrateurs (role 'owner') et employés (role 'staff'), invitations par e-mail
--
-- À exécuter après 0008. Peut précéder la mise en ligne du code : seuls les employés (role 'staff') sont restreints.
--
-- Employé : service, réservations (sans suppression), liste d'attente, fiches clients (sans suppression).
-- Administrateur : tout, dont carte, plan de salle, réglages, fermetures, photos et gestion de l'équipe.
-- Il reste toujours au moins un administrateur par restaurant.

create or replace function public.is_restaurant_admin(p_restaurant uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = p_restaurant and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Droits par table
-- ─────────────────────────────────────────────────────────────

-- Fiche du restaurant (réglages, horaires…) : administrateurs.
drop policy if exists "restaurants membres" on public.restaurants;
drop policy if exists "restaurants admins" on public.restaurants;
create policy "restaurants admins" on public.restaurants for update to authenticated
  using (public.is_restaurant_admin(id)) with check (public.is_restaurant_admin(id));

-- Carte, salles, tables, fermetures : lecture par l'équipe, modification par les administrateurs.
do $$
declare
  t text;
  old_name text;
begin
  foreach t in array array['menu_categories', 'menu_items', 'rooms', 'dining_tables', 'closures'] loop
    old_name := case t
      when 'menu_categories' then 'catégories membres'
      when 'menu_items' then 'plats membres'
      when 'rooms' then 'salles membres'
      when 'dining_tables' then 'tables membres'
      when 'closures' then 'fermetures membres'
    end;
    execute format('drop policy if exists %I on public.%I', old_name, t);
    execute format('drop policy if exists %I on public.%I', t || ' : lecture équipe', t);
    execute format('drop policy if exists %I on public.%I', t || ' : admins', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(restaurant_id))',
      t || ' : lecture équipe', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_restaurant_admin(restaurant_id)) '
      'with check (public.is_restaurant_admin(restaurant_id))', t || ' : admins', t);
  end loop;
end $$;

-- Réservations et fiches clients : toute l'équipe, sauf la suppression (administrateurs).
do $$
declare
  t text;
  old_name text;
begin
  foreach t in array array['reservations', 'customers'] loop
    old_name := case t when 'reservations' then 'réservations membres' else 'clients membres' end;
    execute format('drop policy if exists %I on public.%I', old_name, t);
    execute format('drop policy if exists %I on public.%I', t || ' : lecture équipe', t);
    execute format('drop policy if exists %I on public.%I', t || ' : ajout équipe', t);
    execute format('drop policy if exists %I on public.%I', t || ' : modification équipe', t);
    execute format('drop policy if exists %I on public.%I', t || ' : suppression admins', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(restaurant_id))',
      t || ' : lecture équipe', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_member(restaurant_id))',
      t || ' : ajout équipe', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_member(restaurant_id)) '
      'with check (public.is_member(restaurant_id))', t || ' : modification équipe', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_restaurant_admin(restaurant_id))',
      t || ' : suppression admins', t);
  end loop;
end $$;

-- Photos de la carte : administrateurs.
drop policy if exists "photos carte membres insert" on storage.objects;
drop policy if exists "photos carte membres update" on storage.objects;
drop policy if exists "photos carte membres delete" on storage.objects;
drop policy if exists "photos carte admins insert" on storage.objects;
drop policy if exists "photos carte admins update" on storage.objects;
drop policy if exists "photos carte admins delete" on storage.objects;
create policy "photos carte admins insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and public.is_restaurant_admin(((storage.foldername(name))[1])::uuid));
create policy "photos carte admins update" on storage.objects for update to authenticated
  using (bucket_id = 'menu' and public.is_restaurant_admin(((storage.foldername(name))[1])::uuid));
create policy "photos carte admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and public.is_restaurant_admin(((storage.foldername(name))[1])::uuid));

-- ─────────────────────────────────────────────────────────────
-- Invitations
-- ─────────────────────────────────────────────────────────────

create table if not exists public.restaurant_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('owner', 'staff')),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);
-- Une seule invitation en cours par adresse et par restaurant.
create unique index if not exists restaurant_invitations_pending_idx
  on public.restaurant_invitations (restaurant_id, email) where accepted_at is null;

alter table public.restaurant_invitations enable row level security;
drop policy if exists "invitations admins" on public.restaurant_invitations;
create policy "invitations admins" on public.restaurant_invitations for all to authenticated
  using (public.is_restaurant_admin(restaurant_id)) with check (public.is_restaurant_admin(restaurant_id));
grant select, insert, update, delete on public.restaurant_invitations to authenticated;
grant all on public.restaurant_invitations to service_role;

-- Invitation encore valide, pour la page /invitation/{token} (sans connexion).
create or replace function public.invitation_info(p_token text)
returns table (restaurant_name text, email text, role text)
language sql stable security definer set search_path = public
as $$
  select r.name, i.email, i.role
  from public.restaurant_invitations i
  join public.restaurants r on r.id = i.restaurant_id
  where i.token = p_token and i.accepted_at is null and i.expires_at > now();
$$;

-- Invitation en attente pour l'adresse du compte connecté (redirection après connexion ou inscription).
create or replace function public.my_pending_invitation()
returns text
language sql stable security definer set search_path = public
as $$
  select token from public.restaurant_invitations
  where email = lower(coalesce(auth.jwt() ->> 'email', '')) and accepted_at is null and expires_at > now()
  order by created_at desc
  limit 1;
$$;

-- Le compte connecté rejoint le restaurant : l'adresse du compte doit être celle de l'invitation.
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  inv public.restaurant_invitations;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_current uuid;
begin
  if auth.uid() is null then
    raise exception 'Connectez-vous pour accepter l''invitation.' using errcode = 'P0001';
  end if;
  select * into inv from public.restaurant_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'Cette invitation n''est plus valable. Demandez-en une nouvelle.' using errcode = 'P0001';
  end if;
  if inv.email <> v_email then
    raise exception 'Cette invitation a été envoyée à %. Connectez-vous avec cette adresse.', inv.email using errcode = 'P0001';
  end if;

  select restaurant_id into v_current from public.restaurant_members where user_id = auth.uid() limit 1;
  if v_current is not null and v_current <> inv.restaurant_id then
    raise exception 'Ce compte est déjà rattaché à un autre restaurant.' using errcode = 'P0001';
  end if;
  if v_current is null then
    insert into public.restaurant_members (restaurant_id, user_id, role) values (inv.restaurant_id, auth.uid(), inv.role);
  end if;
  update public.restaurant_invitations set accepted_at = now() where id = inv.id;
  return inv.restaurant_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Gestion de l'équipe (administrateurs)
-- ─────────────────────────────────────────────────────────────

create or replace function public.team_members(p_restaurant uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_restaurant_admin(p_restaurant) then
    raise exception 'Réservé aux administrateurs.' using errcode = 'P0001';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from public.restaurant_members m
    join auth.users u on u.id = m.user_id
    where m.restaurant_id = p_restaurant
    order by m.role, m.created_at;
end;
$$;

create or replace function public.set_member_role(p_restaurant uuid, p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old text;
begin
  if not public.is_restaurant_admin(p_restaurant) then
    raise exception 'Réservé aux administrateurs.' using errcode = 'P0001';
  end if;
  if p_role not in ('owner', 'staff') then
    raise exception 'Rôle invalide.' using errcode = 'P0001';
  end if;
  -- Verrou sur les membres du restaurant : deux rétrogradations simultanées ne peuvent pas retirer le dernier admin.
  perform 1 from public.restaurant_members where restaurant_id = p_restaurant for update;
  select role into v_old from public.restaurant_members where restaurant_id = p_restaurant and user_id = p_user;
  if v_old is null then
    raise exception 'Membre introuvable.' using errcode = 'P0001';
  end if;
  if v_old = 'owner' and p_role <> 'owner'
     and (select count(*) from public.restaurant_members where restaurant_id = p_restaurant and role = 'owner') <= 1 then
    raise exception 'Il doit rester au moins un administrateur.' using errcode = 'P0001';
  end if;
  update public.restaurant_members set role = p_role where restaurant_id = p_restaurant and user_id = p_user;
end;
$$;

create or replace function public.remove_member(p_restaurant uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old text;
begin
  if not public.is_restaurant_admin(p_restaurant) then
    raise exception 'Réservé aux administrateurs.' using errcode = 'P0001';
  end if;
  perform 1 from public.restaurant_members where restaurant_id = p_restaurant for update;
  select role into v_old from public.restaurant_members where restaurant_id = p_restaurant and user_id = p_user;
  if v_old is null then
    raise exception 'Membre introuvable.' using errcode = 'P0001';
  end if;
  if v_old = 'owner'
     and (select count(*) from public.restaurant_members where restaurant_id = p_restaurant and role = 'owner') <= 1 then
    raise exception 'Il doit rester au moins un administrateur.' using errcode = 'P0001';
  end if;
  delete from public.restaurant_members where restaurant_id = p_restaurant and user_id = p_user;
end;
$$;

revoke execute on function public.is_restaurant_admin, public.invitation_info, public.my_pending_invitation,
  public.accept_invitation, public.team_members, public.set_member_role, public.remove_member from public;
grant execute on function public.is_restaurant_admin, public.my_pending_invitation, public.accept_invitation,
  public.team_members, public.set_member_role, public.remove_member to authenticated;
grant execute on function public.invitation_info to anon, authenticated;
grant execute on function public.is_restaurant_admin, public.invitation_info to service_role;
