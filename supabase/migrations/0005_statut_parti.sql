-- Baresto — statut « Parti » (finished) : la table est libérée dès le départ des clients
--
-- À exécuter après 0004. Migration additive.

alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'seated', 'finished', 'cancelled', 'no_show'));

-- Annulée / non venue / déplacée : tables libérées.
-- Partie : la table est occupée jusqu'à maintenant seulement (l'historique du placement est conservé).
-- De nouveau installée après « Partie » : la table est reprise si elle est encore libre.
create or replace function public.release_tables()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_now timestamp;
begin
  if new.status in ('cancelled', 'no_show')
     or new.date is distinct from old.date
     or new.time is distinct from old.time
     or new.duration_minutes is distinct from old.duration_minutes then
    delete from public.reservation_tables where reservation_id = new.id;

  elsif new.status = 'finished' and old.status is distinct from 'finished' then
    select (now() at time zone timezone)::timestamp into v_now from public.restaurants where id = new.restaurant_id;
    update public.reservation_tables
    set during = tsrange(lower(during), greatest(lower(during) + interval '1 minute', least(upper(during), v_now)))
    where reservation_id = new.id;

  elsif old.status = 'finished' and new.status is distinct from 'finished' then
    begin
      update public.reservation_tables
      set during = tsrange(new.date + new.time, new.date + new.time + make_interval(mins => new.duration_minutes))
      where reservation_id = new.id;
    exception
      when exclusion_violation then
        -- La table a été redonnée entre-temps : la réservation repasse « sans table ».
        delete from public.reservation_tables where reservation_id = new.id;
    end;
  end if;
  return new;
end;
$$;

-- Les clients partis reçoivent aussi la demande d'avis le lendemain.
create or replace function public.due_review_requests()
returns setof public.reservations
language sql stable security definer set search_path = public
as $$
  select rv.*
  from public.reservations rv
  join public.restaurants r on r.id = rv.restaurant_id
  where rv.status in ('confirmed', 'seated', 'finished') and rv.email is not null and rv.review_requested_at is null
    and coalesce(trim(r.review_url), '') <> ''
    and rv.date between current_date - 4 and current_date
    and rv.date between (now() at time zone r.timezone)::date - 3 and (now() at time zone r.timezone)::date - 1
    and (now() at time zone r.timezone)::time >= '10:00'
  limit 200;
$$;

revoke execute on function public.release_tables, public.due_review_requests from public, anon, authenticated;
grant execute on function public.due_review_requests to service_role;
