import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { addDays, formatDate, todayIn } from "@/lib/format";
import { cardClass } from "@/components/admin-styles";
import { RESERVATION_SELECT, ReservationRow, type ReservationWithTables } from "./reservations/reservation-row";
import { PERIODS, Stats } from "./stats";

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const { p } = await searchParams;
  const period = PERIODS.find((n) => String(n) === p) ?? 30;
  const { supabase, restaurant } = await requireRestaurant();
  const today = todayIn(restaurant.timezone);

  const [{ data: todayRes }, { data: pending }, { data: week }] = await Promise.all([
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("date", today).in("status", ["pending", "confirmed", "seated"]).order("time"),
    supabase.from("reservations").select(RESERVATION_SELECT).eq("restaurant_id", restaurant.id).eq("status", "pending").gte("date", today).order("date").order("time").limit(50),
    supabase.from("reservations").select("date, party_size").eq("restaurant_id", restaurant.id).gte("date", today).lte("date", addDays(today, 6))
      .in("status", ["pending", "confirmed", "seated"]),
  ]);

  const todayList = (todayRes ?? []) as ReservationWithTables[];
  const pendingList = (pending ?? []) as ReservationWithTables[];
  const weekCovers = (week ?? []).reduce((n, r) => n + r.party_size, 0);
  const todayCovers = todayList.reduce((n, r) => n + r.party_size, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour 👋</h1>
        <p className="text-stone-500 first-letter:uppercase">{formatDate(today)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Couverts aujourd'hui" value={todayCovers} hint={`${todayList.length} réservations`} />
        <Stat label="À confirmer" value={pendingList.length} hint="demandes en attente" highlight={pendingList.length > 0} />
        <Stat label="Couverts sur 7 jours" value={weekCovers} />
      </div>

      {pendingList.length > 0 && (
        <section className={`${cardClass} border-amber-300`}>
          <h2 className="font-semibold">Demandes à confirmer</h2>
          <ul className="divide-y divide-stone-100">
            {pendingList.map((r) => <ReservationRow key={r.id} r={r} showDate />)}
          </ul>
        </section>
      )}

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Service du jour</h2>
          <Link href="/admin/reservations" className="text-sm text-stone-600 underline">Tout voir</Link>
        </div>
        {todayList.length === 0 ? (
          <p className="mt-2 text-stone-500">Aucune réservation aujourd&apos;hui.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {todayList.map((r) => <ReservationRow key={r.id} r={r} />)}
          </ul>
        )}
      </section>

      <Stats supabase={supabase} restaurant={restaurant} period={period} />
    </div>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: number; hint?: string; highlight?: boolean }) {
  return (
    <div className={`${cardClass} ${highlight ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
