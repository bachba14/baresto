import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { HeroService, InteractiveFloor } from "@/components/landing/demo-floor";
import { BrowserFrame, CodeMock, MenuMock, PhoneWidget } from "@/components/landing/mockups";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: { absolute: "Baresto — Réservations en ligne et plan de salle pour restaurants" },
  description:
    "Recevez des réservations 24h/24, placées automatiquement sur la bonne table. Plan de salle 2D/3D, carte en ligne, widget pour votre site. Gratuit pendant la bêta.",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://baresto.example";

const FEATURES = [
  { icon: "📅", title: "Réservation en ligne 24h/24", text: "Vos clients réservent en 30 secondes, depuis votre site, Google ou Instagram. Même quand vous êtes en plein service." },
  { icon: "🪑", title: "Placement automatique", text: "Chaque réservation est attribuée à la plus petite table libre — ou à deux tables collées pour les grands groupes." },
  { icon: "🧊", title: "Plan de salle 2D & 3D", text: "Dessinez votre salle en quelques clics ou générez-la à partir de votre nombre de tables. Visualisez le service en 3D." },
  { icon: "🛡️", title: "Zéro surbooking", text: "Une table ne peut jamais être réservée deux fois au même moment. C'est garanti par la base de données, pas par un tableur." },
  { icon: "📖", title: "Carte en ligne", text: "Plats, prix, photos, allergènes : modifiez votre carte et elle se met à jour partout, instantanément." },
  { icon: "🔌", title: "S'intègre à votre site", text: "Un copier-coller suffit : WordPress, Wix, Squarespace, site sur mesure… Ou utilisez votre page Baresto." },
];

const STEPS = [
  { n: "1", title: "Créez votre compte", text: "Un e-mail, un mot de passe. Pas de carte bancaire." },
  { n: "2", title: "Laissez-vous guider", text: "Horaires, tables, carte, règles de réservation : l'assistant vous accompagne en 5 minutes." },
  { n: "3", title: "Recevez vos réservations", text: "Partagez votre lien ou collez le widget sur votre site. C'est tout." },
];

const FAQ = [
  {
    q: "Est-ce vraiment gratuit ?",
    a: "Oui. Baresto est en bêta : toutes les fonctionnalités sont gratuites, sans engagement et sans carte bancaire.",
  },
  {
    q: "Je n'ai pas de site web, est-ce que ça marche ?",
    a: "Oui. Chaque restaurant a sa propre page de réservation (carte + formulaire) à partager sur Google Maps, Instagram, Facebook ou par SMS.",
  },
  {
    q: "Dois-je valider chaque réservation ?",
    a: "Non, si vous activez la confirmation automatique : Baresto ne propose que les créneaux où une table adaptée est réellement libre, et la réserve aussitôt. Vous pouvez aussi choisir de valider chaque demande.",
  },
  {
    q: "Et les réservations par téléphone ?",
    a: "Saisissez-les en quelques secondes dans le tableau de bord : elles sont placées sur une table comme les autres et bloquent le créneau en ligne.",
  },
  {
    q: "Mon plan de salle change souvent, est-ce un problème ?",
    a: "Non. Déplacez, ajoutez ou retirez des tables à tout moment depuis l'éditeur. Vous pouvez aussi garder certaines tables pour les clients sans réservation.",
  },
];

/** Délai d'apparition du hero, en cascade. */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const primaryCta =
  "rounded-full bg-amber-700 font-semibold text-white shadow-lg shadow-amber-700/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-700/30";
const secondaryCta =
  "rounded-full border border-stone-300 bg-white font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-lg";

export default function Landing() {
  return (
    <div className="overflow-x-clip bg-[#fffaf3] text-stone-900">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-[#fffaf3]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/"><Logo /></Link>
          <div className="hidden items-center gap-7 text-sm text-stone-600 md:flex">
            {[
              ["#fonctionnalites", "Fonctionnalités"],
              ["#plan", "Plan de salle"],
              ["#tarifs", "Tarifs"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="relative transition-colors hover:text-stone-900 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-amber-700 after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:text-stone-900 sm:block">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-stone-700 hover:shadow-lg"
            >
              Essayer gratuitement
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="animate-drift pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-10 text-center sm:pt-24">
          <span
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
            style={delay(0)}
          >
            <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-600" /> Bêta ouverte · 100 % gratuit
          </span>
          <h1
            className="animate-fade-up mx-auto mt-6 max-w-4xl text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl"
            style={delay(100)}
          >
            Vos réservations, placées sur la bonne table.{" "}
            <span className="animate-shine bg-gradient-to-r from-amber-700 via-orange-500 to-amber-700 bg-clip-text text-transparent">
              Automatiquement.
            </span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-stone-600" style={delay(200)}>
            Baresto prend les réservations de votre restaurant 24h/24, les place sur votre plan de salle et vous évite tout
            surbooking. Configuration en 5 minutes, sans compétence technique.
          </p>
          <div className="animate-fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={delay(300)}>
            <Link href="/signup" className={`${primaryCta} w-full px-7 py-3.5 sm:w-auto`}>
              Créer mon restaurant gratuitement
            </Link>
            <Link href="/r/demo" className={`${secondaryCta} w-full px-7 py-3.5 sm:w-auto`}>
              Voir un restaurant de démo
            </Link>
          </div>
          <p className="animate-fade-up mt-4 text-sm text-stone-500" style={delay(400)}>
            Sans carte bancaire · Sans engagement · Prêt en 5 minutes
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20">
          <div className="animate-fade-up lg:mr-44" style={delay(500)}>
            <BrowserFrame url="baresto · Service du soir">
              <HeroService />
            </BrowserFrame>
          </div>
          <div className="animate-fade-up absolute right-4 -bottom-4 hidden lg:block" style={delay(800)}>
            <div className="animate-float rotate-3">
              <PhoneWidget />
            </div>
          </div>
        </div>
      </section>

      {/* ── Bandeau chiffres ── */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center md:grid-cols-4">
          {[
            ["5 min", "pour être en ligne"],
            ["24h/24", "réservations, même en service"],
            ["0", "double réservation possible"],
            ["0 €", "pendant toute la bêta"],
          ].map(([value, label], i) => (
            <Reveal key={label} delay={i * 100}>
              <p className="text-3xl font-bold tracking-tight text-amber-700 sm:text-4xl">{value}</p>
              <p className="mt-1 text-sm text-stone-500">{label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-amber-700 uppercase">Tout-en-un</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tout ce qu&apos;il faut pour remplir votre salle</h2>
          <p className="mt-4 text-stone-600">Pensé avec et pour les restaurateurs : simple le matin, solide en plein coup de feu.</p>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 120}>
              <div className="group h-full rounded-2xl border border-stone-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-900/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  {f.icon}
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Plan de salle 3D ── */}
      <section id="plan" className="scroll-mt-20 bg-stone-900 py-24 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="text-sm font-semibold tracking-wider text-amber-400 uppercase">Plan de salle</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Votre salle, en 3D. Votre service, en un coup d&apos;œil.</h2>
            <p className="mt-4 text-stone-300">
              Indiquez simplement « 6 tables de 2, 4 tables de 4… » : le plan est généré. Ajustez ensuite chaque table à la
              souris pour reproduire votre salle.
            </p>
            <ul className="mt-6 space-y-3 text-stone-200">
              {[
                "Tables rondes, carrées, rectangulaires, combinables",
                "Tables réservées au sans-réservation",
                "Glisser-déposer d'une réservation sur une table",
                "Vue en direct : libre, arrive bientôt, installée",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="text-amber-400">✓</span> {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-stone-400">👉 Essayez : tournez la salle, zoomez, changez l&apos;heure.</p>
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-2xl bg-stone-100 p-3 text-stone-900 shadow-2xl sm:p-4">
              <InteractiveFloor />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Site web & carte ── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="order-2 min-w-0 space-y-5 lg:order-1">
            <CodeMock base={SITE} />
            <MenuMock />
          </Reveal>
          <Reveal className="order-1 lg:order-2" delay={150}>
            <p className="text-sm font-semibold tracking-wider text-amber-700 uppercase">Intégration</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Sur votre site en un copier-coller</h2>
            <p className="mt-4 text-stone-600">
              Ajoutez le formulaire de réservation et votre carte à votre site existant, quel qu&apos;il soit. Ils prennent
              vos couleurs, s&apos;adaptent au mobile et se mettent à jour tout seuls.
            </p>
            <p className="mt-4 text-stone-600">
              Pas de site ? Votre restaurant a sa propre page{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm">/r/votre-restaurant</code>, prête à partager
              sur Google Maps et Instagram.
            </p>
            <Link href="/r/demo" className="group mt-6 inline-flex items-center gap-1 font-semibold text-amber-700">
              Voir la page de démo
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="border-y border-stone-200 bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">En ligne avant le prochain service</h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 150}>
                <div className="group">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-lg font-bold text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-700">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-stone-600">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs ── */}
      <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-amber-700 uppercase">Tarifs</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Gratuit pendant la bêta</h2>
          <p className="mt-4 text-stone-600">Toutes les fonctionnalités, sans limite de réservations, sans carte bancaire.</p>
        </Reveal>
        <Reveal delay={150}>
          <div className="mx-auto mt-12 max-w-md rounded-3xl border-2 border-amber-600 bg-white p-8 shadow-xl shadow-amber-900/10 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/15">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Bêta</h3>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Accès complet</span>
            </div>
            <p className="mt-4">
              <span className="text-5xl font-bold tracking-tight">0 €</span>
              <span className="text-stone-500"> / mois</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Réservations en ligne illimitées",
                "Placement automatique sur les tables",
                "Plan de salle 2D & 3D",
                "Carte en ligne avec photos",
                "Widget pour votre site + page de réservation",
                "Saisie des réservations téléphoniques",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="text-emerald-600">✓</span> {x}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={`${primaryCta} mt-8 block py-3.5 text-center`}>
              Créer mon restaurant
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="faq mx-auto max-w-3xl scroll-mt-20 px-4 pb-24">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight">Questions fréquentes</h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-10 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium transition-colors hover:text-amber-800">
                  {f.q}
                  <span className="text-xl text-stone-400 transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="pt-3 text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Appel final ── */}
      <section className="px-4 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-stone-900 px-6 py-16 text-center text-white sm:px-12">
            <div className="animate-drift pointer-events-none absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-700/40 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Prêt à remplir votre salle ?</h2>
              <p className="mx-auto mt-4 max-w-xl text-stone-300">Créez votre restaurant maintenant et recevez vos premières réservations dès ce soir.</p>
              <Link
                href="/signup"
                className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 font-semibold text-stone-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-xl"
              >
                Commencer gratuitement
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-stone-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row">
          <Logo />
          <div className="flex gap-6">
            <Link href="/r/demo" className="transition-colors hover:text-stone-900">Démo</Link>
            <Link href="/login" className="transition-colors hover:text-stone-900">Connexion</Link>
            <Link href="/signup" className="transition-colors hover:text-stone-900">Inscription</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-stone-900">Confidentialité</Link>
          </div>
          <p>© {new Date().getFullYear()} Baresto</p>
        </div>
      </footer>
    </div>
  );
}
