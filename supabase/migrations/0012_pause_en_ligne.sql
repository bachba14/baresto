-- Monkomi — mettre en pause les réservations en ligne (cuisine en panne, privatisation…), avec réouverture
-- automatique facultative. Les réservations saisies par l'équipe restent possibles.
--
-- À exécuter après 0011. Additive : peut précéder la mise en ligne du code.

alter table public.restaurants add column if not exists online_paused_at timestamptz;
alter table public.restaurants add column if not exists online_resume_at timestamptz;

-- En pause : depuis online_paused_at, jusqu'à online_resume_at (ou jusqu'à réouverture manuelle).
create or replace function public.online_paused(r public.restaurants)
returns boolean
language sql stable set search_path = public
as $$
  select r.online_paused_at is not null and (r.online_resume_at is null or r.online_resume_at > now());
$$;

-- Réservation en ligne ou liste d'attente refusée si le restaurant est en pause ou en cours de suppression (0011).
create or replace function public.reject_deleted_restaurant()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r public.restaurants;
begin
  -- Les réservations saisies par l'équipe restent possibles (fin d'activité, réservations par téléphone).
  if tg_table_name = 'reservations' then
    if new.source <> 'widget' then
      return new;
    end if;
  end if;
  select * into r from public.restaurants where id = new.restaurant_id;
  if r.deletion_requested_at is not null then
    raise exception 'Ce restaurant n''accepte plus de réservations en ligne.' using errcode = 'P0001';
  end if;
  if public.online_paused(r) then
    raise exception 'Les réservations en ligne sont momentanément fermées. Merci d''appeler le restaurant.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.reject_deleted_restaurant from public, anon, authenticated;
