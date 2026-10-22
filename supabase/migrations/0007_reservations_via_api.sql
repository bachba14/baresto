-- Monkomi — réservations et liste d'attente uniquement via l'API du site
--
-- À exécuter après 0006, et APRÈS la mise en ligne du code qui appelle ces fonctions avec la clé secrète
-- (createBookingClient), sinon les réservations en ligne échouent. Nécessite SUPABASE_SECRET_KEY sur le serveur.
--
-- Avant : la clé publique (visible dans le navigateur) permettait d'appeler create_reservation et join_waitlist
-- directement sur Supabase, en contournant les limites par adresse IP, le champ piège et les filtres de l'API.

revoke execute on function public.create_reservation, public.join_waitlist from public, anon, authenticated;
grant execute on function public.create_reservation, public.join_waitlist to service_role;
