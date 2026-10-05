import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { addDays, formatDate, isValidDate, todayIn } from "@/lib/format";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { createReservation } from "./actions";
import { RESERVATION_SELECT, ReservationRow, type ReservationWithTables } from "./reservation-row";

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);
  const date = isValidDate(params.date) ? params.date : today;

  const [{ data }, { data: closure }] = await Promise.all([
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("date", date).order("time"),
    supabase.from("closures").select("reason").eq("restaurant_id", restaurant.id).eq("date", date).maybeSingle(),
  ]);
  const reservations = (data ?? []) as ReservationWithTables[];
  const active = reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const covers = active.reduce((n, r) => n + r.party_size, 0);
  const lunch = active.filter((r) => r.time < "16:00").reduce((n, r) => n + r.party_size, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Réservations</h1>
          <p className="text-stone-500 first-letter:uppercase">{formatDate(date)}</p>
        </div>
        <form className="flex items-center gap-2">
          <Link href={`?date=${addDays(date, -1)}`} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">←</Link>
          <input type="date" name="date" defaultValue={date} className={`${inputClass} w-auto`} />
          <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Voir</button>
          <Link href={`?date=${addDays(date, 1)}`} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">→</Link>
          {date !== today && <Link href="?" className="text-sm text-stone-600 underline">Aujourd&apos;hui</Link>}
        </form>
      </div>

      {closure && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Restaurant fermé ce jour{closure.reason ? ` : ${closure.reason}` : ""}. Les réservations en ligne sont bloquées.
        </p>
      )}

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

      <details className={cardClass}>
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
          <div className="sm:col-span-4">
            <SubmitButton>Enregistrer (confirmée)</SubmitButton>
          </div>
        </form>
      </details>
    </div>
  );
}
