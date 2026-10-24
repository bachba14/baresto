-- Monkomi — bons cadeaux (sans paiement en ligne) : le restaurant vend le bon (comptoir, téléphone) et le crée dans
-- Monkomi ; le bon (montant, de la part de, pour, message, date de fin) s'imprime ou s'envoie par e-mail. Il est
-- utilisé en une fois : l'équipe le marque « utilisé ». Toute l'équipe crée et marque ; seuls les admins suppriment.
--
-- À exécuter après 0013. Additive : peut précéder la mise en ligne du code.

-- Validité des bons du restaurant (en Belgique : au moins un an).
alter table public.restaurants add column if not exists gift_card_months int not null default 12;
alter table public.restaurants drop constraint if exists restaurants_gift_card_months_check;
alter table public.restaurants add constraint restaurants_gift_card_months_check check (gift_card_months between 12 and 60);

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  -- Lien secret du bon à imprimer (envoyé par e-mail) ; ce n'est pas un code à saisir.
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 10000),
  offered_by text check (length(offered_by) <= 120),
  recipient_name text check (length(recipient_name) <= 120),
  message text check (length(message) <= 500),
  send_email text check (length(send_email) <= 200),
  expires_at date not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists gift_cards_restaurant_idx on public.gift_cards (restaurant_id, created_at desc);

alter table public.gift_cards enable row level security;
drop policy if exists "bons : lecture équipe" on public.gift_cards;
create policy "bons : lecture équipe" on public.gift_cards for select to authenticated using (public.is_member(restaurant_id));
drop policy if exists "bons : ajout équipe" on public.gift_cards;
create policy "bons : ajout équipe" on public.gift_cards for insert to authenticated with check (public.is_member(restaurant_id));
drop policy if exists "bons : modification équipe" on public.gift_cards;
create policy "bons : modification équipe" on public.gift_cards for update to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
drop policy if exists "bons : suppression admins" on public.gift_cards;
create policy "bons : suppression admins" on public.gift_cards for delete to authenticated
  using (public.is_restaurant_admin(restaurant_id));
revoke all on public.gift_cards from anon, authenticated;
grant select, insert, update, delete on public.gift_cards to authenticated;
grant all on public.gift_cards to service_role;

-- Bon à imprimer par son lien secret (sans l'adresse e-mail d'envoi).
create or replace function public.gift_card_public(p_token text)
returns table (
  amount numeric, offered_by text, recipient_name text, message text, expires_at date, used_at timestamptz,
  restaurant_name text, restaurant_slug text, currency text, primary_color text, address text, city text, phone text
)
language sql stable security definer set search_path = public
as $$
  select g.amount, g.offered_by, g.recipient_name, g.message, g.expires_at, g.used_at,
         r.name, r.slug, r.currency, r.primary_color, r.address, r.city, r.phone
  from public.gift_cards g join public.restaurants r on r.id = g.restaurant_id
  where g.token = p_token;
$$;
revoke execute on function public.gift_card_public from public;
grant execute on function public.gift_card_public to anon, authenticated, service_role;
