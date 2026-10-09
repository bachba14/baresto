import Link from "next/link";
import { addDays, DAY_ORDER, DAYS, todayIn } from "@/lib/format";
import { cardClass } from "@/components/admin-styles";
import { BarChart } from "@/components/bar-chart";
import { CountUp } from "@/components/count-up";
import { Segmented } from "@/components/segmented";
import { fetchReservationRows } from "@/lib/reservation-rows";
import type { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const PERIODS = [7, 30, 90] as const;

const shortDate = (d: string) => `${Number(d.slice(8, 10))}/${d.slice(5, 7)}`;

/** Statistiques du tableau de bord sur les N derniers jours (aujourd'hui compris). */
export async function Stats({ supabase, restaurant, period }: { supabase: Supabase; restaurant: Restaurant; period: number }) {
  const today = todayIn(restaurant.timezone);
  const from = addDays(today, -(period - 1));
  const rows = await fetchReservationRows(supabase, restaurant.id, from, today);

  const kept = rows.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const covers = kept.reduce((n, r) => n + r.party_size, 0);
  const noShows = rows.filter((r) => r.status === "no_show").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const online = kept.filter((r) => r.source === "widget").length;

  // Par jour : réservations maintenues (hors annulées et non venues).
  const days = Array.from({ length: period }, (_, i) => addDays(from, i));
  const byDay = new Map(days.map((d) => [d, { count: 0, covers: 0 }]));
  for (const r of kept) {
    const d = byDay.get(r.date)!;
    d.count++;
    d.covers += r.party_size;
  }
  const dayBars = days.map((d) => {
    const v = byDay.get(d)!;
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    return {
      key: d,
      label: period <= 7 ? `${DAYS[dow].slice(0, 3)} ${Number(d.slice(8, 10))}` : shortDate(d),
      value: v.count,
      tooltip: `${DAYS[dow]} ${shortDate(d)}${d === today ? " (aujourd’hui)" : ""} : ${v.count} réservation${v.count > 1 ? "s" : ""} · ${v.covers} couverts`,
      muted: d === today,
    };
  });

  // Par jour de la semaine : couverts moyens par jour.
  const weekday = DAY_ORDER.map((dow) => {
    const occurrences = days.filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === dow).length;
    const total = kept.filter((r) => new Date(`${r.date}T00:00:00Z`).getUTCDay() === dow).reduce((n, r) => n + r.party_size, 0);
    const avg = occurrences ? Math.round(total / occurrences) : 0;
    return { key: String(dow), label: DAYS[dow].slice(0, 3), value: avg, tooltip: `${DAYS[dow]} : ${avg} couverts en moyenne` };
  });

  const rate = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);
  const tiles: { label: string; value: number | null; suffix?: string; hint?: string }[] = [
    { label: "Réservations", value: kept.length, hint: `${(kept.length / period).toFixed(1).replace(".", ",")} par jour` },
    { label: "Couverts", value: covers, hint: kept.length ? `${(covers / kept.length).toFixed(1).replace(".", ",")} pers. par table` : undefined },
    { label: "No-show", value: rate(noShows, kept.length + noShows), suffix: " %", hint: `${noShows} client${noShows > 1 ? "s" : ""} non venu${noShows > 1 ? "s" : ""}` },
    { label: "Annulations", value: rate(cancelled, rows.length), suffix: " %", hint: `${cancelled} annulée${cancelled > 1 ? "s" : ""}` },
    { label: "En ligne", value: rate(online, kept.length), suffix: " %", hint: `${kept.length - online} par téléphone / sur place` },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl">Statistiques</h2>
          <Link href="/admin/stats" className="text-sm text-stone-500 transition hover:text-stone-900">Tout voir →</Link>
        </div>
        <Segmented items={PERIODS.map((p) => ({ href: `?p=${p}`, label: `${p} jours` }))} active={PERIODS.indexOf(period as 7)} />
      </div>

      {/* Indicateurs regroupés dans une seule carte, séparés par de fines lignes. */}
      <div className={`${cardClass} grid grid-cols-2 gap-y-5 p-0 py-5 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-stone-100`}>
        {tiles.map((t) => (
          <div key={t.label} className="px-5">
            <p className="text-sm text-stone-500">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {t.value == null ? "—" : <CountUp key={`${t.label}-${period}`} value={t.value} suffix={t.suffix} />}
            </p>
            {t.hint && <p className="text-xs text-stone-400">{t.hint}</p>}
          </div>
        ))}
      </div>

      {/* La clé relance l'animation des barres à chaque changement de période. */}
      <div key={period} className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className={cardClass}>
          <h3 className="font-medium">Réservations par jour</h3>
          <p className="mb-4 text-xs text-stone-400">Hors annulations et non-venues · survolez une barre pour le détail</p>
          <BarChart bars={dayBars} unit="réservations" labelEvery={period <= 7 ? 1 : period <= 30 ? 5 : 15} />
        </div>
        <div className={cardClass}>
          <h3 className="font-medium">Couverts moyens par jour</h3>
          <p className="mb-4 text-xs text-stone-400">Sur les {period} derniers jours</p>
          <BarChart bars={weekday} unit="couverts" />
        </div>
      </div>

      <details className="group text-sm">
        <summary className="cursor-pointer list-none text-stone-500 transition hover:text-stone-900">
          <span className="inline-block transition-transform duration-200 group-open:rotate-90">›</span> Détail jour par jour
        </summary>
        <div className={`${cardClass} mt-2`}>
          <table className="w-full text-left tabular-nums">
            <thead>
              <tr className="border-b border-stone-100 text-stone-500">
                <th className="py-1.5 font-medium">Date</th>
                <th className="py-1.5 font-medium">Réservations</th>
                <th className="py-1.5 font-medium">Couverts</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d} className="border-b border-stone-50">
                  <td className="py-1.5">{DAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]} {shortDate(d)}</td>
                  <td className="py-1.5">{byDay.get(d)!.count}</td>
                  <td className="py-1.5">{byDay.get(d)!.covers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
