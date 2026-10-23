-- Monkomi — notifications sur téléphone (Web Push) : un abonnement par appareil et par membre de l'équipe
--
-- À exécuter après 0009. Additive : peut précéder la mise en ligne du code.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_restaurant_idx on public.push_subscriptions (restaurant_id);

-- Chaque membre gère les abonnements de ses propres appareils. L'envoi passe par la clé secrète du serveur.
alter table public.push_subscriptions enable row level security;
drop policy if exists "abonnements push : les siens" on public.push_subscriptions;
create policy "abonnements push : les siens" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member(restaurant_id));
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Un membre retiré de l'équipe ne reçoit plus les notifications du restaurant.
create or replace function public.member_removed_push()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.push_subscriptions where restaurant_id = old.restaurant_id and user_id = old.user_id;
  return old;
end;
$$;
revoke execute on function public.member_removed_push from public, anon, authenticated;
drop trigger if exists restaurant_members_removed_push on public.restaurant_members;
create trigger restaurant_members_removed_push after delete on public.restaurant_members
  for each row execute function public.member_removed_push();
