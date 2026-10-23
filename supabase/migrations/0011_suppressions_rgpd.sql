-- Monkomi — RGPD : supprimer un client (réservations passées anonymisées) et supprimer son restaurant
-- (coupure immédiate du public, suppression définitive après 30 jours, annulable entre-temps).
--
-- À exécuter après 0010. Additive : peut précéder la mise en ligne du code.

-- ─────────────────────────────────────────────────────────────
-- Client
-- ─────────────────────────────────────────────────────────────

-- Efface la fiche et les données personnelles de ses réservations passées, qui restent pour les statistiques
-- sous le nom « Client supprimé ». Refusé s'il a encore une réservation à venir (le service en a besoin).
create or replace function public.forget_customer(p_customer uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  c public.customers;
  v_today date;
begin
  select * into c from public.customers where id = p_customer;
  if not found then
    raise exception 'Client introuvable.' using errcode = 'P0001';
  end if;
  if not public.is_restaurant_admin(c.restaurant_id) then
    raise exception 'Réservé aux administrateurs.' using errcode = 'P0001';
  end if;

  select (now() at time zone timezone)::date into v_today from public.restaurants where id = c.restaurant_id;
  if exists (
    select 1 from public.reservations
    where customer_id = c.id and date >= v_today and status in ('pending', 'confirmed', 'seated')
  ) then
    raise exception 'Ce client a encore une réservation à venir : annulez-la ou supprimez-la d''abord.' using errcode = 'P0001';
  end if;

  update public.reservations
  set name = 'Client supprimé', email = null, phone = null, notes = null, customer_id = null
  where customer_id = c.id;
  -- Inscriptions en liste d'attente avec la même adresse.
  if c.email is not null then
    delete from public.waitlist where restaurant_id = c.restaurant_id and lower(email) = c.email;
  end if;
  delete from public.customers where id = c.id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Restaurant
-- ─────────────────────────────────────────────────────────────

alter table public.restaurants add column if not exists deletion_requested_at timestamptz;

create or replace function public.request_restaurant_deletion(p_restaurant uuid)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_restaurant_admin(p_restaurant) then
    raise exception 'Réservé aux administrateurs.' using errcode = 'P0001';
  end if;
  update public.restaurants set deletion_requested_at = coalesce(deletion_requested_at, now()) where id = p_restaurant;
  return (select deletion_requested_at + interval '30 days' from public.restaurants where id = p_restaurant);
end;
$$;

create or replace function public.cancel_restaurant_deletion(p_restaurant uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_restaurant_admin(p_restaurant) then
    raise exception 'Réservé aux administrateurs.' using errcode = 'P0001';
  end if;
  update public.restaurants set deletion_requested_at = null where id = p_restaurant;
end;
$$;

-- Pendant le délai, le restaurant n'accepte plus de réservation en ligne ni d'inscription en liste d'attente.
create or replace function public.reject_deleted_restaurant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Les réservations saisies par l'équipe restent possibles (fin d'activité, réservations par téléphone).
  if tg_table_name = 'reservations' then
    if new.source <> 'widget' then
      return new;
    end if;
  end if;
  if exists (select 1 from public.restaurants where id = new.restaurant_id and deletion_requested_at is not null) then
    raise exception 'Ce restaurant n''accepte plus de réservations en ligne.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists reservations_reject_deleted on public.reservations;
create trigger reservations_reject_deleted before insert on public.reservations
  for each row execute function public.reject_deleted_restaurant();
drop trigger if exists waitlist_reject_deleted on public.waitlist;
create trigger waitlist_reject_deleted before insert on public.waitlist
  for each row execute function public.reject_deleted_restaurant();

revoke execute on function public.forget_customer, public.request_restaurant_deletion, public.cancel_restaurant_deletion,
  public.reject_deleted_restaurant from public, anon;
grant execute on function public.forget_customer, public.request_restaurant_deletion, public.cancel_restaurant_deletion
  to authenticated;
revoke execute on function public.reject_deleted_restaurant from authenticated;
