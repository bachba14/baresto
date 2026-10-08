# Baresto

SaaS de réservations en ligne pour restaurants : chaque restaurateur s'inscrit, configure son restaurant en 5 minutes
et reçoit des réservations placées automatiquement sur ses tables.

- **Landing page** (`/`) avec démo 3D interactive, **inscription** (`/signup`) et **connexion** (`/login`).
- **Assistant de démarrage** (`/onboarding`) : restaurant et adresse publique, horaires, tables (configuration rapide), carte, règles de réservation.
- **Back-office** (`/admin`) : tableau de bord, service sur plan 2D/3D, réservations, carte, plan de salle, réglages, intégration.
- **Page publique** par restaurant (`/r/son-restaurant`) : carte + formulaire de réservation.
- **Widgets** à intégrer sur n'importe quel site, et **API JSON** publique par restaurant.

Stack : Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4 · React Three Fiber.

## Installation

1. **Projet Supabase** sur [supabase.com](https://supabase.com).
2. **Schéma** : SQL Editor → exécuter `supabase/migrations/0001_init.sql` puis `0002_saas.sql`
   (0002 remplace le schéma mono-restaurant de 0001 et crée le restaurant de démo `/r/demo`).
3. **Authentification** (Supabase → Authentication → URL Configuration) :
   *Site URL* = l'URL du site (`http://localhost:3000` en local), et ajouter `…/auth/callback` aux *Redirect URLs*.
   La confirmation d'e-mail est activée par défaut ; le service d'e-mail intégré de Supabase est limité à quelques
   envois par heure : configurez un SMTP (Resend, Brevo…) avant l'ouverture au public.
4. **App** :
   ```bash
   cp .env.example .env.local   # URL + clé publishable Supabase (Project Settings → API)
   npm install
   npm run dev
   ```

## Multi-restaurants et sécurité

- Toutes les données portent un `restaurant_id` ; les règles RLS limitent chaque compte à son restaurant
  (`restaurant_members`). Des clés étrangères composites empêchent de lier une table, un plat ou une réservation
  à un autre restaurant.
- Le public ne lit jamais les réservations : disponibilités et création passent par des fonctions SQL
  (`get_availability`, `create_reservation`) qui valident horaires, capacité et tables.
- Photos de la carte : dossier par restaurant dans le bucket `menu`, protégé par les règles de stockage.

## Placement sur les tables

- Chaque réservation en ligne est placée sur la plus petite table libre (ou deux tables combinables) pendant toute la
  durée du repas. S'il n'y a plus de table adaptée, le créneau n'est plus proposé : avec la confirmation automatique,
  le restaurant n'a rien à valider.
- Une contrainte `exclude using gist` rend impossible l'affectation d'une même table à deux réservations qui se chevauchent.

## Intégration sur un site

```html
<div data-baresto="reservation"></div>
<div data-baresto="menu" data-theme="dark" data-color="#0f766e"></div>
<button data-baresto-open="reservation">Réserver</button>

<script src="https://VOTRE-DOMAINE/embed.js" data-restaurant="mon-restaurant" async></script>
```

Démo : `/demo.html`. API : `/api/r/{slug}/menu`, `/api/r/{slug}/availability?date=…&party=…`, `POST /api/r/{slug}/reservations`.

## Déploiement sur Hostinger

Nécessite une offre avec **Node.js Apps** : Business, Cloud (Startup / Professional / Enterprise) ou VPS.

1. hPanel → **Sites web → Ajouter un site → Node.js Apps** → **Importer un dépôt Git** → autoriser GitHub →
   choisir `baresto`, branche `main`.
2. Paramètres de build :
   - Framework : **Next.js** · Version de Node : **22.x**
   - Commande d'installation : `npm ci` · Build : `npm run build` · Démarrage : `npm start`
3. **Variables d'environnement** (à saisir *avant* le premier build : les `NEXT_PUBLIC_*` sont intégrées au build) :

   | Variable | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé *publishable* Supabase |
   | `NEXT_PUBLIC_SITE_URL` | `https://votre-domaine.fr` |
   | `WIDGET_ALLOWED_ORIGINS` | (optionnel) sites autorisés à afficher les widgets |

4. Associer le domaine à l'application, activer le SSL, déployer.
5. Supabase → Authentication → URL Configuration : *Site URL* = `https://votre-domaine.fr`,
   *Redirect URLs* += `https://votre-domaine.fr/auth/callback`.

Le serveur de build d'Hostinger a une glibc trop ancienne pour le compilateur natif « gnu » de Next.js
(`GLIBC_2.29 not found`). D'où deux garde-fous :

- le build utilise **Webpack** (`next build --webpack`), qui accepte le compilateur WebAssembly
  (`@next/swc-wasm-nodejs`, installé d'office) — Turbopack, lui, exige un binaire natif ;
- `scripts/ensure-next-swc.mjs` (`postinstall` et `prebuild`) tente d'installer la variante native « musl »,
  liée statiquement, plus rapide quand elle se charge.

Ne pas descendre à Node 18 : Next.js 16 exige Node ≥ 20.9.

Chaque `git push` sur `main` peut redéclencher le déploiement (option « déploiement automatique » dans hPanel).
Après toute modification d'une variable `NEXT_PUBLIC_*`, relancer un build.

## Structure

```
supabase/migrations/        schéma, fonctions SQL, RLS, restaurant de démo
public/embed.js             script d'intégration
src/app/page.tsx            landing page
src/app/(auth)/             inscription, connexion
src/app/onboarding/         assistant de démarrage
src/app/admin/              back-office
src/app/r/[slug]/           page publique d'un restaurant
src/app/widget/[slug]/      pages affichées dans les iframes
src/app/api/r/[slug]/       API publique
src/components/floor/       plan de salle 2D (SVG) et 3D (three.js)
src/proxy.ts                protection de /admin et /onboarding
```

## Connexion avec Google

Le bouton « Continuer avec Google » (inscription et connexion) utilise Supabase Auth. Pour l'activer :

1. **Google Cloud Console** → APIs & Services → *OAuth consent screen* : configurer l'écran (type *External*,
   nom « Baresto », e-mail d'assistance, domaine `bachba.be`), puis publier l'application.
2. *Credentials* → *Create credentials* → *OAuth client ID* → type **Web application** :
   - *Authorized JavaScript origins* : `https://baresto.bachba.be` (et `http://localhost:3000` pour le local)
   - *Authorized redirect URIs* : `https://<projet>.supabase.co/auth/v1/callback`
3. **Supabase** → Authentication → Sign In / Providers → **Google** : activer, coller le *Client ID* et le
   *Client Secret*, enregistrer.

Un nouveau compte Google arrive directement dans l'assistant de démarrage ; un compte existant avec la même
adresse e-mail est relié automatiquement. Tant que Google n'est pas activé, le bouton affiche un message clair.
