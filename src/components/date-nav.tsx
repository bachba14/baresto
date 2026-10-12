"use client";

import { useRouter } from "next/navigation";
import { addDays } from "@/lib/format";

/**
 * Navigation par date : flèches, sélecteur et « Aujourd'hui ». La date affichée vient toujours de l'URL
 * (une seule source de vérité) : calendrier, flèches, sélecteur et titre restent synchronisés.
 */
export function DateNav({ date, today, extra = "" }: { date: string; today: string; extra?: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`?date=${d}${extra}`, { scroll: false });
  const button =
    "flex h-10 min-w-10 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-sm transition hover:bg-stone-50 disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => go(addDays(date, -1))} className={button} aria-label="Jour précédent">←</button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        aria-label="Choisir une date"
        className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400 focus:ring-4 focus:ring-stone-900/5"
      />
      <button type="button" onClick={() => go(addDays(date, 1))} className={button} aria-label="Jour suivant">→</button>
      <button type="button" onClick={() => go(today)} disabled={date === today} className={button}>
        Aujourd&apos;hui
      </button>
    </div>
  );
}
