-- Monkomi — disponibilités uniquement via l'API du site
--
-- À exécuter après 0007, et APRÈS la mise en ligne du code qui appelle get_availability avec la clé secrète
-- (createBookingClient), sinon les créneaux ne s'affichent plus. Nécessite SUPABASE_SECRET_KEY sur le serveur.
--
-- get_availability renvoie le nombre de places restantes par créneau. L'API du site ne publie plus que
-- « disponible ou non » ; sans cette migration, la clé publique permettrait encore de lire le nombre exact.
-- (create_reservation l'appelle en interne : security definer, non concerné.)

revoke execute on function public.get_availability from public, anon, authenticated;
grant execute on function public.get_availability to service_role;
