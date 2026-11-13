import type { CSSProperties, ReactNode, SVGProps } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { HeroService, InteractiveFloor } from "@/components/landing/demo-floor";
import { EmailCta } from "@/components/landing/email-cta";
import {
  IconArrow,
  IconBell,
  IconCalendar,
  IconChart,
  IconCheck,
  IconCode,
  IconGift,
  IconList,
  IconMail,
  IconMenu,
  IconPause,
  IconPhone,
  IconQr,
  IconShield,
  IconTable,
  IconUpload,
  IconUsers,
  IconX,
} from "@/components/landing/icons";
import { BrowserFrame, CodeMock, MenuMock, PhoneWidget } from "@/components/landing/mockups";
import { Reveal } from "@/components/landing/reveal";
import { Pricing } from "@/components/landing/pricing";
import { PRICES, price } from "@/lib/pricing";
import { SavingsCalculator } from "@/components/landing/savings-calculator";
import { StickyCta } from "@/components/landing/sticky-cta";

export const metadata: Metadata = {
  title: { absolute: "Monkomi — Réservations en ligne sans commission pour restaurants" },
  description:
    "Recevez des réservations 24h/24, placées automatiquement sur la bonne table. Zéro commission, zéro surbooking, plan de salle 2D/3D, rappels e-mail. Dès 24,99 € par mois, tout compris.",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://monkomi.be";

type Icon = (p: SVGProps<SVGSVGElement>) => ReactNode;

const NAV = [
  ["#produit", "Produit"],
  ["#plan", "Plan de salle"],
  ["#tarifs", "Tarifs"],
  ["#faq", "FAQ"],
] as const;

const BEFORE_AFTER = [
  ["Le téléphone sonne en plein coup de feu", "Vos clients réservent en ligne, 24h/24, en 30 secondes"],
  ["Le carnet raturé, les tables comptées de tête", "Chaque réservation est placée sur la bonne table, toute seule"],
  ["Deux clients pour la même table à 20 h", "Surbooking impossible : chaque créneau proposé est réellement libre"],
  ["Des tables vides à cause des oublis", "Rappel par e-mail 48 h avant, annulation en un clic, liste d'attente"],
  ["Une commission sur chaque couvert", "0 € de commission, quel que soit le nombre de réservations"],
];

const ALSO: { icon: Icon; title: string; text: string }[] = [
  { icon: IconUsers, title: "Fiches clients", text: "Historique, visites, notes" },
  { icon: IconChart, title: "Statistiques", text: "Couverts, affluence, part en ligne" },
  { icon: IconGift, title: "Bons cadeaux", text: "À imprimer ou envoyer par e-mail" },
  { icon: IconMenu, title: "Carte en ligne", text: "Plats, prix, photos, allergènes" },
  { icon: IconMail, title: "Demande d'avis", text: "Le lendemain, aux clients venus" },
  { icon: IconUsers, title: "Équipe", text: "Invitations, rôles admin et employé" },
  { icon: IconUpload, title: "Import Excel", text: "Reprenez réservations et clients" },
  { icon: IconQr, title: "QR code", text: "Affiche A4 et chevalets de table" },
  { icon: IconPause, title: "Pause en un clic", text: "Privatisation, cuisine en panne…" },
];

const STEPS = [
  { title: "Créez votre compte", text: "Un e-mail ou votre compte Google. Pas de carte bancaire." },
  { title: "Laissez-vous guider", text: "Horaires, tables, carte, règles : l'assistant vous accompagne en 5 minutes." },
  { title: "Partagez votre lien", text: "Sur Google Maps, Instagram, votre site ou en QR code sur vos tables." },
];

const FAQ = [
  {
    q: "Prenez-vous une commission sur les réservations ?",
    a: "Non, jamais. Que vous receviez 10 ou 2 000 réservations par mois, vous ne payez rien par couvert.",
  },
  {
    q: "Combien coûte Monkomi ?",
    a: `${price(PRICES.annual)} € par mois en paiement annuel, ou ${price(PRICES.monthly)} € par mois en paiement mensuel, tout compris. Les ${PRICES.founderSeats} premiers restaurants profitent du prix fondateur : ${price(PRICES.founder)} € par mois.`,
  },
  {
    q: "Qu'est-ce que le prix fondateur ?",
    a: `Une offre réservée aux ${PRICES.founderSeats} premiers restaurants qui rejoignent Monkomi : ${price(PRICES.founder)} € par mois au lieu de ${price(PRICES.annual)} €, avec exactement les mêmes fonctionnalités. Une fois les ${PRICES.founderSeats} places prises, l'offre disparaît.`,
  },
  {
    q: "Je n'ai pas de site web, est-ce que ça marche ?",
    a: "Oui. Chaque restaurant a sa propre page de réservation (carte + formulaire) à partager sur Google Maps, Instagram, Facebook, par SMS ou en QR code sur vos tables.",
  },
  {
    q: "Dois-je valider chaque réservation ?",
    a: "Non, si vous activez la confirmation automatique : Monkomi ne propose que les créneaux où une table adaptée est réellement libre, et la réserve aussitôt. Vous pouvez aussi choisir de valider chaque demande.",
  },
  {
    q: "Et les réservations par téléphone ?",
    a: "Saisissez-les en quelques secondes dans le tableau de bord : elles sont placées sur une table comme les autres et bloquent le créneau en ligne.",
  },
  {
    q: "J'utilise déjà un autre outil. Puis-je changer facilement ?",
    a: "Oui. Importez vos réservations et vos clients depuis un fichier Excel ou CSV, sans doublons. Un modèle à remplir est fourni.",
  },
  {
    q: "À qui appartiennent les données de mes clients ?",
    a: "À vous. Monkomi ne contacte jamais vos clients pour son propre compte, et vous pouvez exporter toutes vos données en Excel à tout moment.",
  },
];

/** Délai d'apparition du hero, en cascade. */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const eyebrow = "text-sm font-medium text-amber-700";
const h2 = "mt-3 text-3xl tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.1]";

export default function Landing() {
  return (
    <div className="overflow-x-clip bg-white text-stone-900">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-30 border-b border-stone-900/[0.06] bg-white/80 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Monkomi, accueil"><Logo /></Link>
          <div className="hidden items-center gap-8 text-sm text-stone-600 md:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="transition-colors hover:text-stone-900">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/login" className="px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Commencer
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section id="hero" className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(60%_50%_at_50%_0%,rgb(251_191_36/0.16),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
            <a
              href="#tarifs"
              className="animate-fade-up group inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-900/10 transition hover:ring-stone-900/20"
              style={delay(0)}
            >
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-600" />
              Prix fondateur : {price(PRICES.founder)} € / mois pour les {PRICES.founderSeats} premiers
              <IconArrow className="h-3 w-3 text-stone-400 transition-transform group-hover:translate-x-0.5" />
            </a>
            <h1
              className="animate-fade-up mx-auto mt-6 text-[2.6rem] leading-[1.05] tracking-tight text-balance sm:text-[4.25rem]"
              style={delay(80)}
            >
              Des réservations qui se placent <span className="text-amber-700">toutes seules.</span>
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-stone-600" style={delay(160)}>
              Monkomi prend les réservations de votre restaurant 24h/24, les installe sur la bonne table et rappelle vos
              clients avant leur venue. Sans commission, sans surbooking.
            </p>
            <div className="animate-fade-up mt-9 flex flex-col items-center gap-4" style={delay(240)}>
              <EmailCta id="email-hero" />
              <Link href="/r/demo" className="group inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900">
                ou voir un restaurant de démo
                <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ul className="animate-fade-up mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-stone-500" style={delay(320)}>
              {["0 € de commission", "Sans carte bancaire pour commencer", "Prêt en 5 minutes"].map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <IconCheck className="h-4 w-4 text-emerald-600" /> {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <div className="animate-fade-up lg:mr-40" style={delay(420)}>
              <BrowserFrame url="monkomi.be · Service du soir">
                <HeroService />
              </BrowserFrame>
            </div>
            <div className="animate-fade-up absolute right-6 -bottom-2 hidden lg:block" style={delay(700)}>
              <div className="animate-float rotate-2">
                <PhoneWidget />
              </div>
            </div>
          </div>
        </section>

        {/* ── Compatible avec ── */}
        <section className="border-y border-stone-900/[0.06] bg-stone-50/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:px-6 md:flex-row md:justify-between">
            <p className="text-sm text-stone-500">Vos clients réservent depuis</p>
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[15px] font-semibold tracking-tight text-stone-400">
              {["Google Maps", "Instagram", "Facebook", "WordPress", "Wix", "Squarespace", "QR code"].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Avant / après ── */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Pourquoi Monkomi</p>
            <h2 className={h2}>Moins de téléphone. Plus de couverts.</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl ring-1 ring-stone-900/[0.08]">
              <div className="grid grid-cols-2 bg-stone-50 text-sm font-medium">
                <p className="px-5 py-3 text-stone-500 sm:px-8">Aujourd&apos;hui</p>
                <p className="border-l border-stone-900/[0.06] px-5 py-3 text-amber-800 sm:px-8">Avec Monkomi</p>
              </div>
              {BEFORE_AFTER.map(([before, after]) => (
                <div key={before} className="grid grid-cols-2 border-t border-stone-900/[0.06] text-[15px]">
                  <p className="flex gap-3 px-5 py-5 text-stone-500 sm:px-8">
                    <IconX className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" /> {before}
                  </p>
                  <p className="flex gap-3 border-l border-stone-900/[0.06] px-5 py-5 font-medium sm:px-8">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> {after}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Produit : grille de fonctionnalités ── */}
        <section id="produit" className="scroll-mt-16 bg-stone-50 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className={eyebrow}>Le produit</p>
              <h2 className={h2}>Tout ce qu&apos;il faut pour remplir votre salle. Rien de superflu.</h2>
              <p className="mt-4 text-lg text-stone-600">Simple le matin, solide en plein coup de feu.</p>
            </Reveal>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {/* Placement automatique */}
              <Reveal className="md:col-span-2">
                <Card icon={IconTable} title="Placement automatique" text="Chaque réservation est attribuée à la plus petite table libre, ou à deux tables collées pour les grands groupes. Vous n'avez plus rien à calculer.">
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm ring-1 ring-stone-900/[0.06]">
                      <p className="font-medium">Camille M. · 4 pers.</p>
                      <p className="text-stone-500">Vendredi · 20h00</p>
                    </div>
                    <IconArrow className="h-5 w-5 shrink-0 rotate-90 self-center text-stone-300 sm:rotate-0" />
                    <div className="flex gap-2">
                      {[
                        ["T2", "2 pl.", false],
                        ["T5", "4 pl.", true],
                        ["T8", "6 pl.", false],
                      ].map(([label, seats, on]) => (
                        <div
                          key={label as string}
                          className={`rounded-xl px-4 py-3 text-center text-sm ${
                            on ? "bg-amber-700 text-white shadow-lg shadow-amber-700/20" : "bg-stone-50 text-stone-400 ring-1 ring-stone-900/[0.06]"
                          }`}
                        >
                          <p className="font-semibold">{label}</p>
                          <p className="text-xs opacity-80">{seats}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={100}>
                <Card icon={IconShield} title="Zéro surbooking, garanti" text="Une table ne peut jamais être réservée deux fois au même moment. C'est verrouillé par la base de données, pas par un tableur." />
              </Reveal>

              <Reveal>
                <Card icon={IconCalendar} title="Réservation 24h/24" text="Vos clients choisissent date, heure et nombre de personnes en 30 secondes, même quand vous êtes en cuisine." />
              </Reveal>

              <Reveal delay={100} className="md:col-span-2">
                <Card icon={IconMail} title="Moins de tables vides" text="Les oublis coûtent cher. Monkomi confirme, rappelle et remplit les désistements à votre place.">
                  <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-3">
                    {[
                      ["Rappel 48 h avant", "par e-mail, avec ajout à l'agenda"],
                      ["Annulation en un clic", "le client libère sa table lui-même"],
                      ["Liste d'attente", "« une table s'est libérée » envoyé seul"],
                    ].map(([t, s]) => (
                      <li key={t} className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-900/[0.06]">
                        <p className="font-medium">{t}</p>
                        <p className="text-stone-500">{s}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>

              <Reveal>
                <Card icon={IconPhone} title="Saisie téléphone" text="Une réservation par téléphone ? Saisie en quelques secondes, placée sur une table, elle bloque le créneau en ligne." />
              </Reveal>
              <Reveal delay={100}>
                <Card icon={IconBell} title="Alertes sur votre téléphone" text="Installez Monkomi sur votre écran d'accueil : une notification à chaque nouvelle réservation ou annulation." />
              </Reveal>
              <Reveal delay={200}>
                <Card icon={IconCode} title="Sur votre site" text="Un copier-coller suffit pour ajouter la réservation et la carte à n'importe quel site. Ou utilisez votre page Monkomi." />
              </Reveal>
            </div>

            {/* Et aussi */}
            <Reveal>
              <div className="mt-16">
                <p className="text-sm font-medium text-stone-500">Et aussi, inclus sans supplément</p>
                <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                  {ALSO.map(({ icon: Ico, title, text }) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-stone-700 ring-1 ring-stone-900/[0.08]">
                        <Ico className="h-[18px] w-[18px]" />
                      </span>
                      <span>
                        <span className="block text-[15px] font-medium">{title}</span>
                        <span className="block text-sm text-stone-500">{text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Plan de salle 3D ── */}
        <section id="plan" className="scroll-mt-16 bg-stone-950 py-24 text-white sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.35fr]">
            <Reveal>
              <p className="text-sm font-medium text-amber-400">Plan de salle</p>
              <h2 className={`${h2} text-white`}>Votre service, en un coup d&apos;œil.</h2>
              <p className="mt-5 text-lg text-stone-400">
                Indiquez « 6 tables de 2, 4 tables de 4… » et le plan est généré. Ajustez ensuite chaque table à la souris.
              </p>
              <ul className="mt-8 space-y-3 text-stone-200">
                {[
                  "Tables rondes, carrées, rectangulaires, combinables",
                  "Tables gardées pour les clients sans réservation",
                  "Glisser-déposer une réservation sur une table",
                  "En direct : libre, arrive bientôt, installée",
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <IconCheck className="mt-1 h-4 w-4 shrink-0 text-amber-400" /> {x}
                  </li>
                ))}
              </ul>
              <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm text-stone-300 ring-1 ring-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Essayez : tournez la salle, zoomez, changez l&apos;heure
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-2xl bg-stone-100 p-3 text-stone-900 shadow-2xl ring-1 ring-white/10 sm:p-4">
                <InteractiveFloor />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Intégration ── */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="order-2 min-w-0 space-y-4 lg:order-1">
              <CodeMock base={SITE} />
              <MenuMock />
            </Reveal>
            <Reveal className="order-1 lg:order-2" delay={120}>
              <p className={eyebrow}>Intégration</p>
              <h2 className={h2}>Sur votre site en un copier-coller.</h2>
              <p className="mt-5 text-lg text-stone-600">
                Le formulaire de réservation et votre carte prennent vos couleurs, s&apos;adaptent au mobile et se mettent à
                jour tout seuls.
              </p>
              <p className="mt-4 text-stone-600">
                Pas de site ? Votre restaurant a sa propre page, prête à partager sur Google Maps et Instagram, ou à imprimer
                en QR code pour vos tables.
              </p>
              <Link href="/r/demo" className="group mt-7 inline-flex items-center gap-1.5 font-medium text-amber-700 hover:text-amber-800">
                Voir la page de démo
                <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── Économies ── */}
        <section className="bg-stone-50 py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <Reveal>
              <p className={eyebrow}>Zéro commission</p>
              <h2 className={h2}>Vos réservations ne devraient pas vous coûter par couvert.</h2>
              <p className="mt-5 text-lg text-stone-600">
                Les plateformes à commission prélèvent un montant sur chaque client que vous recevez. Avec Monkomi, c&apos;est
                zéro, quel que soit votre succès.
              </p>
              <p className="mt-4 text-stone-600">Faites le calcul avec vos propres chiffres.</p>
            </Reveal>
            <Reveal delay={120}>
              <SavingsCalculator />
            </Reveal>
          </div>
        </section>

        {/* ── Comment ça marche ── */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Démarrage</p>
            <h2 className={h2}>En ligne avant le prochain service.</h2>
          </Reveal>
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <li className="h-full rounded-3xl p-7 ring-1 ring-stone-900/[0.08]">
                  <span className="text-sm font-medium text-stone-400 tabular-nums">0{i + 1}</span>
                  <h3 className="mt-6 text-xl tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-stone-600">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ── Tarifs ── */}
        <section id="tarifs" className="scroll-mt-16 bg-stone-50 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className={eyebrow}>Tarifs</p>
              <h2 className={h2}>Un prix simple. Tout compris.</h2>
              <p className="mt-4 text-lg text-stone-600">Pas d&apos;options payantes, pas de commission sur vos couverts.</p>
            </Reveal>
            <Reveal delay={100} className="mt-12">
              <Pricing />
            </Reveal>
            <Reveal delay={150}>
              <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-stone-500">
                <li className="flex items-center gap-2"><IconShield className="h-4 w-4" /> Données hébergées en Europe</li>
                <li className="flex items-center gap-2"><IconUpload className="h-4 w-4 rotate-180" /> Export Excel à tout moment</li>
                <li className="flex items-center gap-2"><IconList className="h-4 w-4" /> Accord de sous-traitance RGPD inclus</li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="faq scroll-mt-16 mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <p className={eyebrow}>FAQ</p>
            <h2 className={h2}>Vos questions.</h2>
            <p className="mt-4 text-stone-600">
              Une autre question ? Créez votre compte et explorez : la visite guidée vous montre tout.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="divide-y divide-stone-900/[0.08] border-y border-stone-900/[0.08]">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex list-none items-center justify-between gap-4 text-[17px] font-medium">
                    {f.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-stone-900/10 transition-transform duration-300 group-open:rotate-45">
                      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </span>
                  </summary>
                  <p className="pt-3 pr-10 leading-relaxed text-stone-600">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Appel final ── */}
        <section id="inscription" className="px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-20 text-center text-white sm:px-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,rgb(180_83_9/0.45),transparent)]" />
              <div className="relative flex flex-col items-center">
                <h2 className="max-w-2xl text-3xl tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
                  Vos premières réservations en ligne, dès ce soir.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-stone-400">
                  5 minutes pour configurer votre restaurant. Prix fondateur à {price(PRICES.founder)} € par mois, réservé
                  aux {PRICES.founderSeats} premiers restaurants.
                </p>
                <div className="mt-9 w-full max-w-md">
                  <EmailCta id="email-final" dark />
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-stone-900/[0.06] pb-20 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500 sm:px-6 md:flex-row">
          <Logo />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/r/demo" className="transition-colors hover:text-stone-900">Démo</Link>
            <Link href="/login" className="transition-colors hover:text-stone-900">Connexion</Link>
            <Link href="/signup" className="transition-colors hover:text-stone-900">Inscription</Link>
            <Link href="/conditions" className="transition-colors hover:text-stone-900">Conditions</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-stone-900">Confidentialité</Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-stone-900">Mentions légales</Link>
          </div>
          <p>© {new Date().getFullYear()} Monkomi</p>
        </div>
      </footer>

      <StickyCta />
    </div>
  );
}

/** Carte de la grille « produit ». */
function Card({ icon: Ico, title, text, children }: { icon: Icon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="h-full rounded-3xl bg-white p-7 ring-1 ring-stone-900/[0.06] transition-shadow duration-300 hover:shadow-lg hover:shadow-stone-900/[0.04]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
        <Ico className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-lg tracking-tight">{title}</h3>
      <p className="mt-2 leading-relaxed text-stone-600">{text}</p>
      {children}
    </div>
  );
}
