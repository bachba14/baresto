import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { addDays, closureLabel, formatDate, formatTime, isValidDate, todayIn } from "@/lib/format";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import type { Closure, WaitlistEntry } from "@/lib/types";
import { MonthCalendar } from "./month-calendar";
import { createReservation, deleteWaitlistEntry } from "./actions";
import { RESERVATION_SELECT, ReservationRow, type ReservationWithTables } from "./reservation-row";

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);
  const date = isValidDate(params.date) ? params.date : today;
  // Mois affiché dans le calendrier : celui demandé, sinon celui du jour sélectionné.
  const month = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : date.slice(0, 7);

  const [{ data }, { data: closureData }, { data: waiting }] = await Promise.all([
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("date", date).order("time"),
    supabase.from("closures").select("*").eq("restaurant_id", restaurant.id).eq("date", date).order("start_time", { nullsFirst: true }),
    supabase.from("waitlist").select("*").eq("restaurant_id", restaurant.id).eq("date", date).in("status", ["waiting", "notified"]).order("created_at"),
  ]);
  const waitlist = (waiting ?? []) as WaitlistEntry[];
  const closures = (closureData ?? []) as Closure[];
  const reservations = (data ?? []) as ReservationWithTables[];
  const active = reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const covers = active.reduce((n, r) => n + r.party_size, 0);
  const lunch = active.filter((r) => r.time < restaurant.dinner_from).reduce((n, r) => n + r.party_size, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Réservations</h1>
          <p className="text-stone-500 first-letter:uppercase">{formatDate(date)}</p>
        </div>
        <form className="flex items-center gap-2">
          <Link href={`?date=${addDays(date, -1)}`} scroll={false} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">←</Link>
          <input type="date" name="date" defaultValue={date} className={`${inputClass} w-auto`} />
          <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Voir</button>
          <Link href={`?date=${addDays(date, 1)}`} scroll={false} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">→</Link>
          {date !== today && <Link href="?" className="text-sm text-stone-600 underline">Aujourd&apos;hui</Link>}
        </form>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <a href={`/admin/print?date=${date}`} target="_blank" className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50">
          🖨 Imprimer la feuille de service
        </a>
        <a href={`/admin/reservations/export?from=${date}&to=${date}`} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50">
          ⬇ Export CSV du jour
        </a>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50">⬇ Export CSV (période)</summary>
          <form action="/admin/reservations/export" className="absolute z-10 mt-1 flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
            <label className="text-xs">Du<input type="date" name="from" defaultValue={addDays(date, -30)} required className={inputClass} /></label>
            <label className="text-xs">Au<input type="date" name="to" defaultValue={date} required className={inputClass} /></label>
            <button className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white">Télécharger</button>
          </form>
        </details>
      </div>

      <MonthCalendar supabase={supabase} restaurant={restaurant} month={month} selected={date} />

      {closures.map((c) => (
        <p key={c.id} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Fermé ce jour — {closureLabel(c, restaurant.dinner_from).toLowerCase()}
          {c.reason ? ` (${c.reason})` : ""}. Aucune réservation en ligne n&apos;est proposée sur cette plage.
        </p>
      ))}

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Réservations", active.length],
          ["Couverts", covers],
          ["Midi / Soir", `${lunch} / ${covers - lunch}`],
        ].map(([label, value]) => (
          <div key={label} className={cardClass}>
            <p className="text-xs text-stone-500">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        {reservations.length === 0 ? (
          <p className="text-stone-500">Aucune réservation pour ce jour.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {reservations.map((r) => <ReservationRow key={r.id} r={r} />)}
          </ul>
        )}
      </div>

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
                  <SubmitButton variant="danger" aria-label="Retirer de la liste">✕</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details id="nouvelle" open={params.new === "1"} className={`${cardClass} scroll-mt-6`}>
        <summary className="cursor-pointer font-semibold">+ Ajouter une réservation (téléphone, sur place)</summary>
        <form action={createReservation} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" name="date" defaultValue={date} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Heure</label>
            <input type="time" name="time" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Couverts</label>
            <input type="number" name="party_size" min={1} defaultValue={2} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nom</label>
            <input name="name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input name="phone" type="tel" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input name="email" type="email" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Remarques</label>
            <input name="notes" className={inputClass} />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
            <SubmitButton>Enregistrer (confirmée)</SubmitButton>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" name="send_email" defaultChecked />
              Envoyer la confirmation par e-mail (si e-mail renseigné)
            </label>
          </div>
        </form>
      </details>
    </div>
  );
}
