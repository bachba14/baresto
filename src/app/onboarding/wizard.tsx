"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { HoursEditor } from "@/components/hours-editor";
import { QuickSetup } from "@/app/admin/(app)/floor/quick-setup";
import type { OpeningHours, Restaurant } from "@/lib/types";
import {
  checkSlug,
  finishStep,
  menuStep,
  saveHoursStep,
  saveRestaurantStep,
  skipTablesStep,
  type StepState,
} from "./actions";

const STEPS = ["Restaurant", "Horaires", "Tables", "Carte", "Réservations"];

const primaryBtn =
  "rounded-lg bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-50";
const secondaryBtn = "rounded-lg border border-stone-300 bg-white px-5 py-2.5 font-medium hover:bg-stone-50 disabled:opacity-50";

/** "Chez Léa & Co" → "chez-lea-co" */
function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function Wizard({
  step,
  restaurant,
  tableCount,
  email,
}: {
  step: number;
  restaurant: Restaurant | null;
  tableCount: number;
  email?: string;
}) {
  return (
    <div className="space-y-8">
      <ol className="flex gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${state === "todo" ? "bg-stone-200" : "bg-amber-600"}`} />
              <p className={`mt-2 hidden text-xs sm:block ${state === "current" ? "font-semibold text-stone-900" : "text-stone-500"}`}>
                {n}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      {step === 1 && <RestaurantStep restaurant={restaurant} email={email} />}
      {step === 2 && restaurant && <HoursStep restaurant={restaurant} />}
      {step === 3 && restaurant && <TablesStep restaurant={restaurant} tableCount={tableCount} />}
      {step === 4 && <MenuStep />}
      {step === 5 && restaurant && <RulesStep restaurant={restaurant} tableCount={tableCount} />}
    </div>
  );
}

function StepHeader({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-stone-500">{text}</p>
    </div>
  );
}

function ErrorBox({ error }: { error?: string | null }) {
  return error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null;
}

function BackLink({ to }: { to: number }) {
  return (
    <a href={`/onboarding?step=${to}`} className="text-sm text-stone-500 hover:text-stone-900">
      ← Retour
    </a>
  );
}

// ── 1. Restaurant ─────────────────────────────────────────

function RestaurantStep({ restaurant, email }: { restaurant: Restaurant | null; email?: string }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveRestaurantStep, null);
  const [name, setName] = useState(restaurant?.name ?? "");
  const [slug, setSlug] = useState(restaurant?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!restaurant);
  const [slugStatus, setSlugStatus] = useState<"ok" | "taken" | "invalid" | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  useEffect(() => {
    if (effectiveSlug.length < 3) return;
    let cancelled = false;
    const t = setTimeout(() => checkSlug(effectiveSlug).then((s) => !cancelled && setSlugStatus(s)), 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [effectiveSlug]);

  return (
    <form action={action} className={`${cardClass} space-y-5 p-6 sm:p-8`}>
      <StepHeader title="Bienvenue ! Parlons de votre restaurant" text="Ces informations apparaîtront sur votre page de réservation." />
      <label className="block">
        <span className={labelClass}>Nom du restaurant</span>
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Le Comptoir"
          className={`${inputClass} text-base`}
          autoFocus
        />
      </label>
      <label className="block">
        <span className={labelClass}>Adresse de votre page</span>
        <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-200">
          <span className="pl-3 text-sm text-stone-400">baresto…/r/</span>
          <input
            name="slug"
            required
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            className="w-full rounded-lg bg-transparent px-1 py-2 text-sm outline-none"
          />
        </div>
        <span className={`text-xs ${slugStatus === "ok" ? "text-emerald-700" : slugStatus ? "text-red-600" : "text-stone-500"}`}>
          {effectiveSlug.length < 3
            ? "3 caractères minimum."
            : slugStatus === "ok"
              ? "✓ Disponible"
              : slugStatus === "taken"
                ? "Déjà prise, choisissez-en une autre."
                : slugStatus === "invalid"
                  ? "Lettres minuscules, chiffres et tirets uniquement."
                  : "Vérification…"}
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Type de cuisine</span>
          <input name="cuisine" defaultValue={restaurant?.cuisine ?? ""} placeholder="Bistrot, pizzeria, japonais…" className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Ville</span>
          <input name="city" defaultValue={restaurant?.city ?? ""} className={inputClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Adresse</span>
          <input name="address" defaultValue={restaurant?.address ?? ""} placeholder="12 rue des Halles" className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Téléphone</span>
          <input name="phone" type="tel" defaultValue={restaurant?.phone ?? ""} className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>E-mail de contact</span>
          <input name="email" type="email" defaultValue={restaurant?.email ?? email ?? ""} className={inputClass} />
        </label>
      </div>
      <ErrorBox error={state?.error} />
      <div className="flex justify-end">
        <button disabled={pending || slugStatus === "taken"} className={primaryBtn}>
          {pending ? "Enregistrement…" : "Continuer →"}
        </button>
      </div>
    </form>
  );
}

// ── 2. Horaires ───────────────────────────────────────────

function HoursStep({ restaurant }: { restaurant: Restaurant }) {
  const [hours, setHours] = useState<OpeningHours>(restaurant.opening_hours);
  const [slot, setSlot] = useState(restaurant.slot_minutes);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className={`${cardClass} space-y-5 p-6 sm:p-8`}>
      <StepHeader
        title="Quand peut-on réserver ?"
        text="Pour chaque service, indiquez la première et la dernière heure d'arrivée possible."
      />
      <HoursEditor value={hours} onChange={setHours} />
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Proposer un créneau toutes les
        <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className={`${inputClass} w-auto`}>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>heures</option>
        </select>
      </label>
      <ErrorBox error={error} />
      <div className="flex items-center justify-between">
        <BackLink to={1} />
        <button
          disabled={pending}
          onClick={() => start(async () => setError((await saveHoursStep(hours, slot))?.error ?? null))}
          className={primaryBtn}
        >
          {pending ? "Enregistrement…" : "Continuer →"}
        </button>
      </div>
    </div>
  );
}

// ── 3. Tables ─────────────────────────────────────────────

function TablesStep({ restaurant, tableCount }: { restaurant: Restaurant; tableCount: number }) {
  const router = useRouter();
  const [covers, setCovers] = useState(restaurant.max_covers_per_slot);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-5">
      <div className={`${cardClass} p-6 sm:p-8`}>
        <StepHeader
          title="Vos tables"
          text="Baresto place chaque réservation sur une vraie table libre : vous n'avez plus rien à vérifier, même en confirmation automatique."
        />
        {tableCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-900">
            <span>✓ {tableCount} tables configurées. Vous pourrez ajuster le plan à tout moment.</span>
            <button onClick={() => router.push("/onboarding?step=4")} className={primaryBtn}>Continuer →</button>
          </div>
        ) : (
          <QuickSetup hasTables={false} alwaysOpen onDone={() => router.push("/onboarding?step=4")} />
        )}
      </div>

      {tableCount === 0 && (
        <details className={`${cardClass} p-6`}>
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            Je préfère ne pas gérer de tables pour l&apos;instant
          </summary>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-stone-500">
              Les réservations seront alors limitées par un nombre maximum de couverts par créneau.
            </p>
            <label className="flex items-center gap-2 text-sm">
              Maximum
              <input type="number" min={1} value={covers} onChange={(e) => setCovers(Number(e.target.value))} className={`${inputClass} w-24`} />
              couverts par créneau
            </label>
            <ErrorBox error={error} />
            <button
              disabled={pending}
              onClick={() => start(async () => setError((await skipTablesStep(covers))?.error ?? null))}
              className={secondaryBtn}
            >
              Continuer sans tables
            </button>
          </div>
        </details>
      )}
      <BackLink to={2} />
    </div>
  );
}

// ── 4. Carte ──────────────────────────────────────────────

function MenuStep() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const choose = (example: boolean) => start(async () => setError((await menuStep(example))?.error ?? null));

  return (
    <div className={`${cardClass} space-y-5 p-6 sm:p-8`}>
      <StepHeader title="Votre carte" text="Affichez votre carte sur votre site et votre page de réservation, toujours à jour." />
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          disabled={pending}
          onClick={() => choose(true)}
          className="rounded-xl border-2 border-amber-600 bg-amber-50 p-5 text-left transition hover:bg-amber-100 disabled:opacity-50"
        >
          <p className="text-2xl">🍽️</p>
          <p className="mt-2 font-semibold">Partir d&apos;une carte d&apos;exemple</p>
          <p className="text-sm text-stone-600">Entrées, plats, desserts déjà prêts : il ne reste qu&apos;à modifier noms et prix.</p>
        </button>
        <button
          disabled={pending}
          onClick={() => choose(false)}
          className="rounded-xl border-2 border-stone-200 bg-white p-5 text-left transition hover:border-stone-400 disabled:opacity-50"
        >
          <p className="text-2xl">📝</p>
          <p className="mt-2 font-semibold">Commencer avec une carte vide</p>
          <p className="text-sm text-stone-600">Vous ajouterez vos catégories et vos plats depuis le tableau de bord.</p>
        </button>
      </div>
      <ErrorBox error={error} />
      <BackLink to={3} />
    </div>
  );
}

// ── 5. Règles de réservation ──────────────────────────────

function RulesStep({ restaurant, tableCount }: { restaurant: Restaurant; tableCount: number }) {
  const [state, action, pending] = useActionState<StepState, FormData>(finishStep, null);
  const [auto, setAuto] = useState(restaurant.auto_confirm);
  const [color, setColor] = useState(restaurant.primary_color);

  return (
    <form action={action} className={`${cardClass} space-y-6 p-6 sm:p-8`}>
      <StepHeader title="Dernière étape : vos règles" text="Vous pourrez tout modifier plus tard dans les réglages." />

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { value: true, title: "⚡ Confirmation automatique", text: "Le client reçoit sa confirmation immédiatement. Recommandé." },
          { value: false, title: "✋ Je valide chaque demande", text: "Les réservations restent « en attente » jusqu'à votre validation." },
        ].map((o) => (
          <label
            key={String(o.value)}
            className={`cursor-pointer rounded-xl border-2 p-4 transition ${auto === o.value ? "border-amber-600 bg-amber-50" : "border-stone-200 hover:border-stone-400"}`}
          >
            <input type="radio" className="sr-only" checked={auto === o.value} onChange={() => setAuto(o.value)} />
            <p className="font-semibold">{o.title}</p>
            <p className="text-sm text-stone-600">{o.text}</p>
          </label>
        ))}
        {auto && <input type="hidden" name="auto_confirm" value="on" />}
      </div>
      {auto && tableCount === 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Sans plan de tables, seule la limite de couverts par créneau évite le surbooking.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className={labelClass}>Taille de groupe max.</span>
          <input name="max_party_size" type="number" min={1} max={50} defaultValue={restaurant.max_party_size} className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Réserver au plus tard</span>
          <select name="min_notice_minutes" defaultValue={restaurant.min_notice_minutes} className={inputClass}>
            <option value={0}>jusqu&apos;au dernier moment</option>
            <option value={30}>30 min avant</option>
            <option value={60}>1 h avant</option>
            <option value={120}>2 h avant</option>
            <option value={1440}>la veille</option>
          </select>
        </label>
        <label>
          <span className={labelClass}>Réserver jusqu&apos;à</span>
          <select name="booking_days_ahead" defaultValue={restaurant.booking_days_ahead} className={inputClass}>
            <option value={14}>2 semaines à l&apos;avance</option>
            <option value={30}>1 mois à l&apos;avance</option>
            <option value={60}>2 mois à l&apos;avance</option>
            <option value={180}>6 mois à l&apos;avance</option>
          </select>
        </label>
      </div>

      <label className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-stone-700">Couleur de vos widgets</span>
        <input type="color" name="primary_color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-stone-300" />
        <span className="rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: color }}>Réserver une table</span>
      </label>

      <ErrorBox error={state?.error} />
      <div className="flex items-center justify-between">
        <BackLink to={4} />
        <button disabled={pending} className={primaryBtn}>
          {pending ? "Finalisation…" : "Terminer la configuration 🎉"}
        </button>
      </div>
    </form>
  );
}
