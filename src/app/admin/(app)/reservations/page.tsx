import Link from "next/link";
import { DateNav } from "@/components/date-nav";
import { requireRestaurant } from "@/lib/data";
import { addDays, closureLabel, formatDate, formatTime, isValidDate, todayIn } from "@/lib/format";
import { cardClass, inputClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import type { Closure, WaitlistEntry } from "@/lib/types";
import { NewReservationButton } from "../new-reservation";
import { MonthCalendar } from "./month-calendar";
import { deleteWaitlistEntry } from "./actions";
import { RESERVATION_SELECT, ReservationRow, type ReservationWithTables } from "./reservation-row";

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);
  const date = isValidDate(params.date) ? params.date : today;
  // Recherche sur toutes les dates (nom, e-mail ou téléphone). Caractères réservés de PostgREST retirés.
  const q = typeof params.q === "string" ? params.q.replace(/[,()*%\\]/g, " ").trim().slice(0, 60) : "";
  // Mois affiché dans le calendrier : celui demandé, sinon celui du jour sélectionné.
  const month = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : date.slice(0, 7);

  const [{ data }, { data: closureData }, { data: waiting }] = await Promise.all([
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("date", date).order("time"),
    supabase.from("closures").select("*").eq("restaurant_id", restaurant.id).eq("date", date).order("start_time", { nullsFirst: true }),
    supabase.from("waitlist").select("*").eq("restaurant_id", restaurant.id).eq("date", date).in("status", ["waiting", "notified"]).order("created_at"),
  ]);
  let found: { upcoming: ReservationWithTables[]; past: ReservationWithTables[] } | null = null;
  if (q.length >= 2) {
    // Téléphone : on ignore espaces, points et indicatif (« 0470 12 34 » trouve « 0470123456 »).
    const digits = q.replace(/\D/g, "");
    const phone = digits.length >= 4 ? `%${digits.slice(-9).split("").join("%")}%` : `%${q}%`;
    const filter = `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.${phone}`;
    const base = () => supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).or(filter);
    const [{ data: upcoming }, { data: past }] = await Promise.all([
      base().gte("date", today).order("date").order("time").limit(30),
      base().lt("date", today).order("date", { ascending: false }).order("time", { ascending: false }).limit(30),
    ]);
    found = { upcoming: (upcoming ?? []) as ReservationWithTables[], past: (past ?? []) as ReservationWithTables[] };
  }
  const waitlist = (waiting ?? []) as WaitlistEntry[];
  const closures = (closureData ?? []) as Closure[];
  const reservations = (data ?? []) as ReservationWithTables[];
  const active = reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const covers = active.reduce((n, r) => n + r.party_size, 0);
  const lunch = active.filter((r) => r.time < restaurant.dinner_from).reduce((n, r) => n + r.party_size, 0);
  const toolLink = "rounded-lg border border-stone-200 bg-white px-3 py-2 transition hover:bg-stone-50";

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Réservations</h1>
          <p className="text-stone-500 first-letter:uppercase">{formatDate(date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateNav date={date} today={today} />
          <NewReservationButton date={date} className="h-10 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white transition hover:bg-stone-700" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <form className="flex min-w-64 flex-1 gap-2" role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher : nom, téléphone ou e-mail"
            className={`${inputClass} flex-1`}
            aria-label="Rechercher une réservation sur toutes les dates"
          />
          <button className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-medium transition hover:bg-stone-50">Rechercher</button>
        </form>
        <a href={`/admin/print?date=${date}`} target="_blank" className={toolLink}>🖨 Imprimer</a>
        <details className="relative">
          <summary className={`${toolLink} cursor-pointer list-none`}>⬇ Exporter</summary>
          <div className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-xl bg-white p-3 shadow-lg ring-1 ring-stone-900/10">
            <a href={`/admin/reservations/export?from=${date}&to=${date}`} className="block rounded-lg px-2 py-1.5 hover:bg-stone-50">Ce jour (CSV)</a>
            <form action="/admin/reservations/export" className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2">
              <label className="text-xs text-stone-500">Du<input type="date" name="from" defaultValue={addDays(date, -30)} required className={inputClass} /></label>
              <label className="text-xs text-stone-500">Au<input type="date" name="to" defaultValue={date} required className={inputClass} /></label>
              <button className="col-span-2 rounded-lg bg-stone-900 px-3 py-2 text-white">Télécharger la période</button>
            </form>
          </div>
        </details>
      </div>

      {found && (
        <section className={`${cardClass} animate-rise`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              Résultats pour « {q} »
              <span className="ml-2 text-sm font-normal text-stone-500">
                {found.upcoming.length + found.past.length} réservation{found.upcoming.length + found.past.length > 1 ? "s" : ""}
              </span>
            </h2>
            <Link href={`?date=${date}`} className="text-sm text-stone-500 hover:text-stone-900">Effacer ✕</Link>
          </div>
          {found.upcoming.length + found.past.length === 0 && <p className="mt-2 text-sm text-stone-500">Aucune réservation trouvée.</p>}
          {found.upcoming.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium tracking-wide text-stone-500 uppercase">À venir</p>
              <ul className="divide-y divide-stone-100">
                {found.upcoming.map((r) => <ReservationRow key={r.id} r={r} showDate />)}
              </ul>
            </>
          )}
          {found.past.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium tracking-wide text-stone-500 uppercase">Passées</p>
              <ul className="divide-y divide-stone-100">
                {found.past.map((r) => <ReservationRow key={r.id} r={r} showDate />)}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Calendrier compact à gauche, réservations du jour à droite */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6">
          <MonthCalendar supabase={supabase} restaurant={restaurant} month={month} selected={date} />
        </div>

        <div className="space-y-4">
          {closures.map((c) => (
            <p key={c.id} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Fermé ce jour — {closureLabel(c, restaurant.dinner_from).toLowerCase()}
              {c.reason ? ` (${c.reason})` : ""}. Aucune réservation en ligne n&apos;est proposée sur cette plage.
            </p>
          ))}

          <section className={`${cardClass} p-0`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <h2 className="font-semibold first-letter:uppercase">{formatDate(date)}</h2>
              <p className="flex gap-4 text-sm text-stone-500">
                <span><strong className="text-stone-900 tabular-nums">{active.length}</strong> résa</span>
                <span><strong className="text-stone-900 tabular-nums">{covers}</strong> couverts</span>
                <span title="Couverts du midi / du soir">☀ <strong className="text-stone-900 tabular-nums">{lunch}</strong> · ☾ <strong className="text-stone-900 tabular-nums">{covers - lunch}</strong></span>
              </p>
            </div>
            <div className="px-5">
              {reservations.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-stone-500">Aucune réservation pour ce jour.</p>
                  <NewReservationButton date={date} className="mt-3 text-sm font-medium text-amber-700 hover:underline">
                    + Ajouter une réservation
                  </NewReservationButton>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {reservations.map((r) => <ReservationRow key={r.id} r={r} />)}
                </ul>
              )}
            </div>
          </section>

          {waitlist.length > 0 && (
            <section className={cardClass}>
              <h2 className="font-semibold">Liste d&apos;attente ({waitlist.length})</h2>
              <p className="text-sm text-stone-500">
                Ces personnes reçoivent automatiquement un e-mail dès qu&apos;une table adaptée se libère ce jour-là.
              </p>
              <ul className="mt-2 divide-y divide-stone-100">
                {waitlist.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="font-medium">{w.name} · {w.party_size} pers.</span>
                    <span className="text-stone-500">{w.time ? `vers ${formatTime(w.time)}` : "horaire libre"}</span>
                    <span className="text-stone-500">{[w.phone, w.email].filter(Boolean).join(" · ")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.status === "notified" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>
                      {w.status === "notified" ? "Prévenu(e)" : "En attente"}
                    </span>
                    <form action={deleteWaitlistEntry.bind(null, w.id)} className="ml-auto">
                      <SubmitButton variant="danger" aria-label={`Retirer ${w.name} de la liste d'attente`}>✕</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
