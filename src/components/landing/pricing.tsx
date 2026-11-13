"use client";

import { useState } from "react";
import Link from "next/link";
import { PRICES, percent, price } from "@/lib/pricing";
import { IconCheck } from "./icons";

const INCLUDED = [
  "Réservations en ligne illimitées",
  "0 € de commission",
  "Placement automatique sur les tables",
  "Plan de salle 2D & 3D",
  "Rappels et confirmations par e-mail",
  "Liste d'attente automatique",
  "Notifications sur téléphone",
  "Fiches clients et statistiques",
  "Carte en ligne avec photos",
  "Widget + page de réservation",
  "Bons cadeaux",
  "Équipe illimitée",
];

/** Offre fondateur + offre standard (annuelle ou mensuelle), puis la liste de ce qui est inclus. */
export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const standard = annual ? PRICES.annual : PRICES.monthly;
  const discount = percent(1 - PRICES.annual / PRICES.monthly);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Bascule annuel / mensuel */}
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Période de facturation" className="inline-flex rounded-full bg-white p-1 text-sm shadow-sm ring-1 ring-stone-900/10">
          {[
            [true, "Annuel"],
            [false, "Mensuel"],
          ].map(([value, label]) => (
            <button
              key={label as string}
              type="button"
              role="radio"
              aria-checked={annual === value}
              onClick={() => setAnnual(value as boolean)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${annual === value ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
            >
              {label as string}
              {value && (
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] ${annual ? "bg-white/15 text-white" : "bg-amber-100 text-amber-800"}`}>
                  −{discount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {/* Fondateur */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl bg-stone-950 p-8 text-white shadow-xl shadow-stone-900/10 sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgb(180_83_9/0.4),transparent)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">Fondateur</p>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-400/30">
                {PRICES.founderSeats} places seulement
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-400">Pour les {PRICES.founderSeats} premiers restaurants.</p>
            <p className="mt-8 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{price(PRICES.founder)} €</span>
              <span className="text-stone-400">HT / mois</span>
            </p>
            <p className="mt-1 text-sm text-stone-400">
              facturé {price(PRICES.founder * 12)} € HT par an, au lieu de{" "}
              <span className="line-through">{price(PRICES.annual * 12)} €</span>
            </p>
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-amber-300">
              <IconCheck className="h-4 w-4" /> Prix garanti à vie
            </p>
            <Link
              href="/signup"
              className="mt-8 block rounded-full bg-amber-600 py-3.5 text-center font-semibold text-white transition hover:bg-amber-500 md:mt-auto"
            >
              Devenir restaurant fondateur
            </Link>
          </div>
        </div>

        {/* Standard */}
        <div className="flex flex-col rounded-3xl bg-white p-8 ring-1 ring-stone-900/[0.08] sm:p-10">
          <p className="font-medium">Standard</p>
          <p className="mt-1 text-sm text-stone-500">Toutes les fonctionnalités, sans limite.</p>
          <p className="mt-8 flex items-baseline gap-1.5">
            <span className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">{price(standard)} €</span>
            <span className="text-stone-500">HT / mois</span>
          </p>
          <p className="mt-1 text-sm text-stone-500" aria-live="polite">
            {annual ? `facturé ${price(PRICES.annual * 12)} € HT par an` : "facturé chaque mois"}
          </p>
          <Link
            href="/signup"
            className="mt-8 block rounded-full bg-stone-900 py-3.5 text-center font-semibold text-white transition hover:bg-stone-700 md:mt-auto"
          >
            Créer mon restaurant
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-8 ring-1 ring-stone-900/[0.08] sm:p-10">
        <p className="text-sm font-medium text-stone-500">Inclus dans chaque offre</p>
        <ul className="mt-5 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((x) => (
            <li key={x} className="flex gap-2.5">
              <IconCheck className="mt-1 h-4 w-4 shrink-0 text-amber-700" /> {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
