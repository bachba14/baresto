-- Monkomi — surveillance : état des composants (tâche programmée, e-mails, notifications) et erreurs serveur,
-- lus par /api/health, que surveille un service externe (alerte par e-mail ou notification).
--
-- À exécuter après 0012. Additive : peut précéder la mise en ligne du code.
-- Écriture et lecture uniquement avec la clé secrète du serveur (RLS sans règle : aucun accès public).

create table if not exists public.system_health (
  component text primary key check (component in ('cron', 'email', 'push')),
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.system_health enable row level security;
grant all on public.system_health to service_role;

-- Erreurs serveur (pages, API, actions) : chemin sans paramètres ni liens secrets, message tronqué.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text,
  route text,
  kind text,
  message text,
  digest text
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
grant all on public.app_errors to service_role;

-- Double sécurité : aucun droit pour la clé publique ni pour les comptes connectés (Supabase en accorde par défaut).
revoke all on public.system_health, public.app_errors from anon, authenticated;
