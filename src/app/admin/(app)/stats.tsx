import Link from "next/link";
import { addDays, DAY_ORDER, DAYS, todayIn } from "@/lib/format";
import { cardClass } from "@/components/admin-styles";
import { BarChart } from "@/components/bar-chart";
import type { createClient } from "@/lib/supabase/server";
import type { Reservation, Restaurant } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Pick<Reservation, "date" | "party_size" | "status" | "source">;

export const PERIODS = [7, 30, 90] as const;

/** Toutes les lignes de la période (l'API renvoie au plus 1 000 lignes par requête). */
async function fetchRows(supabase: Supabase, restaurantId: string, from: string, to: string) {
  const rows: Row[] = [];
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { data, error } = await supabase
      .from("reservations")
      .select("date, party_size, status, source")
      .eq("restaurant_id", restaurantId)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  return rows;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : "—");
const shortDate = (d: string) => `${Number(d.slice(8, 10))}/${d.slice(5, 7)}`;

/** Statistiques du tableau de bord sur les N derniers jours (aujourd'hui compris). */
export async function Stats({ supabase, restaurant, period }: { supabase: Supabase; restaurant: Restaurant; period: number }) {
  const today = todayIn(restaurant.timezone);
  const from = addDays(today, -(period - 1));
  const rows = await fetchRows(supabase, restaurant.id, from, today);

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

  const tiles: [string, string | number, string?][] = [
    ["Réservations", kept.length, `${(kept.length / period).toFixed(1).replace(".", ",")} par jour`],
    ["Couverts", covers, kept.length ? `${(covers / kept.length).toFixed(1).replace(".", ",")} pers. par table` : undefined],
    ["Taux de no-show", pct(noShows, kept.length + noShows), `${noShows} client${noShows > 1 ? "s" : ""} non venu${noShows > 1 ? "s" : ""}`],
    ["Annulations", pct(cancelled, rows.length), `${cancelled} annulée${cancelled > 1 ? "s" : ""}`],
    ["Réservé en ligne", pct(online, kept.length), `${kept.length - online} par téléphone / sur place`],
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Statistiques</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`?p=${p}`}
              scroll={false}
              className={`rounded-lg px-3 py-1.5 text-sm ${p === period ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
            >
              {p} jours
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map(([label, value, hint]) => (
          <div key={label} className={cardClass}>
            <p className="text-sm text-stone-500">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {hint && <p className="text-xs text-stone-500">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className={cardClass}>
          <h3 className="font-medium">Réservations par jour</h3>
          <p className="mb-4 text-xs text-stone-500">Hors annulations et non-venues · survolez une barre pour le détail</p>
          <BarChart bars={dayBars} unit="réservations" labelEvery={period <= 7 ? 1 : period <= 30 ? 5 : 15} />
        </div>
        <div className={cardClass}>
          <h3 className="font-medium">Couverts moyens par jour de la semaine</h3>
          <p className="mb-4 text-xs text-stone-500">Sur les {period} derniers jours</p>
          <BarChart bars={weekday} unit="couverts" />
        </div>
      </div>

      <details className={`${cardClass} text-sm`}>
        <summary className="cursor-pointer font-medium">Voir le détail jour par jour</summary>
        <table className="mt-3 w-full text-left tabular-nums">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Réservations</th>
              <th className="py-1 font-medium">Couverts</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d} className="border-b border-stone-100">
                <td className="py-1">{DAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]} {shortDate(d)}</td>
                <td className="py-1">{byDay.get(d)!.count}</td>
                <td className="py-1">{byDay.get(d)!.covers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
