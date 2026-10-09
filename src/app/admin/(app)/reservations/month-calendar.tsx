import Link from "next/link";
import { closureLabel, todayIn } from "@/lib/format";
import { fetchReservationRows, isKept } from "@/lib/reservation-rows";
import type { createClient } from "@/lib/supabase/server";
import type { Closure, Restaurant } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pad = (n: number) => String(n).padStart(2, "0");
function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/**
 * Calendrier du mois : couverts et réservations de chaque jour (midi / soir), fermetures.
 * Plus la case est foncée, plus la journée est chargée : utile pour prévoir le personnel.
 * Chaque jour est cliquable et affiche ses réservations en dessous.
 */
export async function MonthCalendar({
  supabase,
  restaurant,
  month,
  selected,
}: {
  supabase: Supabase;
  restaurant: Restaurant;
  /** AAAA-MM */
  month: string;
  /** Jour affiché sous le calendrier (AAAA-MM-JJ). */
  selected: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = `${month}-01`;
  const last = `${month}-${pad(daysInMonth)}`;
  const today = todayIn(restaurant.timezone);
  const dinnerFrom = restaurant.dinner_from.slice(0, 5);

  const [rows, { data: closureData }, { data: waiting }] = await Promise.all([
    fetchReservationRows(supabase, restaurant.id, first, last),
    supabase.from("closures").select("*").eq("restaurant_id", restaurant.id).gte("date", first).lte("date", last),
    supabase.from("waitlist").select("date").eq("restaurant_id", restaurant.id).gte("date", first).lte("date", last).in("status", ["waiting", "notified"]),
  ]);

  const stats = new Map<string, { count: number; covers: number; lunch: number; dinner: number; pending: number }>();
  for (const r of rows.filter(isKept)) {
    const s = stats.get(r.date) ?? { count: 0, covers: 0, lunch: 0, dinner: 0, pending: 0 };
    s.count++;
    s.covers += r.party_size;
    if (r.time.slice(0, 5) >= dinnerFrom) s.dinner += r.party_size;
    else s.lunch += r.party_size;
    if (r.status === "pending") s.pending++;
    stats.set(r.date, s);
  }
  const closures = (closureData ?? []) as Closure[];
  const waitCount = new Map<string, number>();
  for (const w of waiting ?? []) waitCount.set(w.date, (waitCount.get(w.date) ?? 0) + 1);

  const max = Math.max(1, ...[...stats.values()].map((s) => s.covers));
  const monthCovers = [...stats.values()].reduce((n, s) => n + s.covers, 0);
  const monthCount = [...stats.values()].reduce((n, s) => n + s.count, 0);

  // Grille du lundi au dimanche.
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  const link = (date: string, monthParam = month) => `?date=${date}&month=${monthParam}`;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={link(selected, shiftMonth(month, -1))} scroll={false} className="rounded-lg border border-stone-300 px-2.5 py-1 text-sm" aria-label="Mois précédent">←</Link>
          <h2 className="w-40 text-center font-semibold capitalize">{MONTHS[m - 1]} {y}</h2>
          <Link href={link(selected, shiftMonth(month, 1))} scroll={false} className="rounded-lg border border-stone-300 px-2.5 py-1 text-sm" aria-label="Mois suivant">→</Link>
        </div>
        <p className="text-sm text-stone-500">
          {monthCount} réservations · <span className="font-medium text-stone-700">{monthCovers} couverts</span> ce mois-ci
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center font-medium text-stone-500">{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`vide-${i}`} />;
          const s = stats.get(date);
          const dayClosures = closures.filter((c) => c.date === date);
          const fullClosed = dayClosures.some((c) => !c.start_time && !c.end_time);
          const ratio = s ? s.covers / max : 0;
          const dark = ratio > 0.6;
          const isSelected = date === selected;
          const label = [
            `${Number(date.slice(8))} ${MONTHS[m - 1]}`,
            s ? `${s.count} réservation${s.count > 1 ? "s" : ""}, ${s.covers} couverts (midi ${s.lunch}, soir ${s.dinner})` : "aucune réservation",
            ...dayClosures.map((c) => `fermé : ${closureLabel(c, restaurant.dinner_from)}`),
          ].join(" — ");
          return (
            <Link
              key={date}
              href={link(date)}
              scroll={false}
              title={label}
              aria-label={label}
              aria-current={isSelected ? "date" : undefined}
              className={`flex min-h-[4.5rem] flex-col rounded-lg border p-1.5 transition hover:border-stone-500 sm:min-h-20 ${
                isSelected ? "border-stone-900 ring-2 ring-stone-900" : "border-stone-200"
              } ${date < today ? "opacity-60" : ""} ${fullClosed ? "bg-stone-100" : ""}`}
              style={s && !fullClosed ? { background: `rgb(217 119 6 / ${0.08 + ratio * 0.72})` } : undefined}
            >
              <span className={`font-semibold ${date === today ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white" : dark ? "text-white" : ""}`}>
                {Number(date.slice(8))}
              </span>
              {fullClosed ? (
                <span className="mt-auto text-[11px] text-stone-500">Fermé</span>
              ) : (
                s && (
                  <span className={`mt-auto leading-tight ${dark ? "text-white" : "text-stone-800"}`}>
                    <span className="block text-sm font-semibold tabular-nums">{s.covers} <span className="text-[11px] font-normal">couv.</span></span>
                    <span className="hidden text-[11px] tabular-nums sm:block">M {s.lunch} · S {s.dinner}</span>
                  </span>
                )
              )}
              <span className="flex flex-wrap gap-0.5">
                {!fullClosed && dayClosures.length > 0 && <span className="rounded bg-stone-800 px-1 text-[10px] text-white">fermé {closureLabel(dayClosures[0], restaurant.dinner_from).toLowerCase()}</span>}
                {!!s?.pending && <span className="rounded bg-white/90 px-1 text-[10px] text-amber-800">{s.pending} à confirmer</span>}
                {!!waitCount.get(date) && <span className="rounded bg-white/90 px-1 text-[10px] text-sky-800">{waitCount.get(date)} en attente</span>}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Plus la case est foncée, plus la journée est chargée. M = couverts du midi, S = du soir. Cliquez sur un jour pour voir ses réservations.
      </p>
    </section>
  );
}
