-- Monkomi — demande d'avis réservée aux clients pointés venus
--
-- À exécuter après 0005. Remplace seulement la fonction.
-- Avant : les réservations restées « Confirmée » recevaient aussi la demande d'avis, y compris des clients
-- qui ne sont pas venus. Désormais, seuls les clients « Installée » ou « Partie » la reçoivent ; le tableau
-- de bord affiche les réservations passées à pointer.

create or replace function public.due_review_requests()
returns setof public.reservations
language sql stable security definer set search_path = public
as $$
  select rv.*
  from public.reservations rv
  join public.restaurants r on r.id = rv.restaurant_id
  where rv.status in ('seated', 'finished') and rv.email is not null and rv.review_requested_at is null
    and coalesce(trim(r.review_url), '') <> ''
    and rv.date between current_date - 4 and current_date
    and rv.date between (now() at time zone r.timezone)::date - 3 and (now() at time zone r.timezone)::date - 1
    and (now() at time zone r.timezone)::time >= '10:00'
  limit 200;
$$;

revoke execute on function public.due_review_requests from public, anon, authenticated;
grant execute on function public.due_review_requests to service_role;
