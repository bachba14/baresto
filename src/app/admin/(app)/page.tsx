import type { CSSProperties } from "react";
import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { addDays, DAYS, formatDate, formatTime, STATUS_LABELS, todayIn } from "@/lib/format";
import { cardClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { BarChart } from "@/components/bar-chart";
import { CountUp } from "@/components/count-up";
import { CustomerBadges } from "@/components/customer-badges";
import { updateStatus } from "./reservations/actions";
import { RESERVATION_SELECT, type ReservationWithTables } from "./reservations/reservation-row";
import { PERIODS, Stats } from "./stats";

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  seated: "bg-sky-500",
  finished: "bg-stone-300",
};

/** Délai d'apparition en cascade (voir .animate-rise dans globals.css). */
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

function greeting(timezone: string) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const { p } = await searchParams;
  const period = PERIODS.find((n) => String(n) === p) ?? 30;
  const { supabase, restaurant } = await requireRestaurant();
  const today = todayIn(restaurant.timezone);
  const dinnerFrom = restaurant.dinner_from.slice(0, 5);

  const [{ data: todayRes }, { data: pending }, { data: week }] = await Promise.all([
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("date", today).in("status", ["pending", "confirmed", "seated", "finished"]).order("time"),
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("status", "pending").gte("date", today).order("date").order("time").limit(50),
    supabase.from("reservations").select("date, party_size").eq("restaurant_id", restaurant.id).gte("date", today).lte("date", addDays(today, 6))
      .in("status", ["pending", "confirmed", "seated", "finished"]),
  ]);

  const todayList = (todayRes ?? []) as ReservationWithTables[];
  const pendingList = (pending ?? []) as ReservationWithTables[];
  const covers = (list: { party_size: number }[]) => list.reduce((n, r) => n + r.party_size, 0);
  const lunch = todayList.filter((r) => r.time.slice(0, 5) < dinnerFrom);
  const dinner = todayList.filter((r) => r.time.slice(0, 5) >= dinnerFrom);
  const weekCovers = covers(week ?? []);

  // Les 7 prochains jours, pour prévoir le personnel.
  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => {
    const v = covers((week ?? []).filter((r) => r.date === d));
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    return { key: d, label: i18nDay(dow, d === today), value: v, tooltip: `${DAYS[dow]} ${Number(d.slice(8))} : ${v} couverts` };
  });

  return (
    <div className="max-w-6xl space-y-8">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500 first-letter:uppercase">{formatDate(today)}</p>
          <h1 className="mt-1 text-3xl tracking-tight">{greeting(restaurant.timezone)} 👋</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <a href={`/r/${restaurant.slug}`} target="_blank" className="rounded-xl px-3 py-2 text-stone-600 transition hover:bg-stone-900/5 hover:text-stone-900">
            Page publique ↗
          </a>
          <Link href="/admin/reservations?new=1#nouvelle" className="rounded-xl bg-stone-900 px-4 py-2 font-medium text-white transition hover:bg-stone-700">
            + Réservation
          </Link>
        </div>
      </header>

      {/* Chiffres clés */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`${cardClass} animate-rise`} style={delay(60)}>
          <p className="text-sm text-stone-500">Couverts aujourd&apos;hui</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight"><CountUp value={covers(todayList)} /></p>
          <p className="mt-1 text-sm text-stone-500">
            {todayList.length} réservation{todayList.length > 1 ? "s" : ""} · midi {covers(lunch)} · soir {covers(dinner)}
          </p>
        </div>
        <Link
          href={pendingList.length ? "#a-confirmer" : "/admin/reservations"}
          className={`${cardClass} lift animate-rise block ${pendingList.length ? "bg-amber-50 ring-amber-200" : ""}`}
          style={delay(120)}
        >
          <p className={`text-sm ${pendingList.length ? "text-amber-800" : "text-stone-500"}`}>À confirmer</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight"><CountUp value={pendingList.length} /></p>
          <p className="mt-1 text-sm text-stone-500">{pendingList.length ? "demandes en attente" : "tout est à jour ✓"}</p>
        </Link>
        <div className={`${cardClass} animate-rise`} style={delay(180)}>
          <p className="text-sm text-stone-500">Couverts sur 7 jours</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight"><CountUp value={weekCovers} /></p>
          <p className="mt-1 text-sm text-stone-500">{Math.round(weekCovers / 7)} par jour en moyenne</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Service du jour */}
        <section className={`${cardClass} animate-rise p-0`} style={delay(240)}>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg">Service du jour</h2>
            <Link href="/admin/reservations" className="text-sm text-stone-500 transition hover:text-stone-900">Tout voir →</Link>
          </div>
          {todayList.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-3xl">🍽️</p>
              <p className="mt-2 text-stone-500">Aucune réservation aujourd&apos;hui.</p>
            </div>
          ) : (
            <div className="pb-2">
              {[["Midi", lunch], ["Soir", dinner]].map(([label, list]) =>
                (list as ReservationWithTables[]).length ? (
                  <div key={label as string}>
                    <p className="px-5 pt-4 pb-1 text-xs font-medium tracking-wide text-stone-400 uppercase">
                      {label as string} · {covers(list as ReservationWithTables[])} couverts
                    </p>
                    <ul>
                      {(list as ReservationWithTables[]).map((r, i) => <ServiceRow key={r.id} r={r} index={i} />)}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </section>

        <div className="space-y-4">
          {/* Demandes à confirmer */}
          <section id="a-confirmer" className={`${cardClass} animate-rise scroll-mt-6`} style={delay(300)}>
            <h2 className="text-lg">À confirmer</h2>
            {pendingList.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Aucune demande en attente.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {pendingList.slice(0, 6).map((r) => (
                  <li key={r.id} className="rounded-xl bg-stone-50 p-3">
                    <p className="text-sm font-medium">
                      {r.name} · {r.party_size} pers.
                    </p>
                    <p className="text-xs text-stone-500 first-letter:uppercase">
                      {formatDate(r.date)} à {formatTime(r.time)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <form action={updateStatus.bind(null, r.id, "confirmed")}>
                        <SubmitButton className="rounded-lg px-3 py-1.5 text-xs">Confirmer</SubmitButton>
                      </form>
                      <form action={updateStatus.bind(null, r.id, "cancelled")}>
                        <SubmitButton variant="ghost" className="rounded-lg px-3 py-1.5 text-xs">Refuser</SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
                {pendingList.length > 6 && (
                  <li>
                    <Link href="/admin/reservations" className="text-sm text-stone-500 hover:text-stone-900">
                      + {pendingList.length - 6} autres demandes →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Semaine à venir */}
          <section className={`${cardClass} animate-rise`} style={delay(360)}>
            <h2 className="text-lg">Les 7 prochains jours</h2>
            <p className="mb-4 text-xs text-stone-500">Couverts déjà réservés · pour prévoir l&apos;équipe</p>
            <BarChart bars={nextDays} unit="couverts" height={120} />
          </section>
        </div>
      </div>

      <div className="animate-rise" style={delay(420)}>
        <Stats supabase={supabase} restaurant={restaurant} period={period} />
      </div>
    </div>
  );
}

function i18nDay(dow: number, isToday: boolean) {
  return isToday ? "Auj." : DAYS[dow].slice(0, 3);
}

/** Ligne compacte du service : heure, client, couverts, table, statut. */
function ServiceRow({ r, index }: { r: ReservationWithTables; index: number }) {
  const tables = (r.reservation_tables ?? []).map((t) => t.dining_tables?.label).filter(Boolean);
  return (
    <li
      className="animate-rise flex items-center gap-4 px-5 py-2.5 transition-colors hover:bg-stone-50"
      style={delay(280 + Math.min(index, 10) * 40)}
    >
      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{formatTime(r.time)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {r.customers ? (
            <Link href={`/admin/clients/${r.customers.id}`} className="truncate font-medium hover:underline">{r.name}</Link>
          ) : (
            <span className="truncate font-medium">{r.name}</span>
          )}
          <CustomerBadges customer={r.customers} compact />
        </span>
        {(r.notes || r.customers?.notes) && (
          <span className="block truncate text-xs text-stone-500">{[r.notes, r.customers?.notes].filter(Boolean).join(" · ")}</span>
        )}
      </span>
      <span className="shrink-0 text-sm tabular-nums text-stone-600">{r.party_size} pers.</span>
      <span className="hidden w-16 shrink-0 text-xs text-stone-500 sm:block">
        {tables.length ? `Table ${tables.join("+")}` : <span className="text-amber-700">Sans table</span>}
      </span>
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-stone-500">
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] ?? "bg-stone-300"}`} />
        {STATUS_LABELS[r.status]}
      </span>
    </li>
  );
}
