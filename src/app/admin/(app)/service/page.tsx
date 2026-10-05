import Link from "next/link";
import { getFloor, getPlacedReservations, requireRestaurant } from "@/lib/data";
import { addDays, formatDate, isValidDate, todayIn } from "@/lib/format";
import { inputClass } from "@/components/admin-styles";
import { ServiceBoard } from "./service-board";

function nowIn(timezone: string) {
  const t = new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const [h, m] = t.split(":").map(Number);
  return h * 60 + Math.floor(m / 15) * 15;
}

export default async function ServicePage({ searchParams }: PageProps<"/admin/service">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);
  const date = isValidDate(params.date) ? params.date : today;
  const [{ rooms, tables }, reservations] = await Promise.all([
    getFloor(supabase, restaurant.id),
    getPlacedReservations(supabase, restaurant.id, date),
  ]);

  const firstActive = reservations.find((r) => r.status !== "cancelled" && r.status !== "no_show");
  const initialTime =
    date === today ? nowIn(restaurant.timezone) : firstActive ? Number(firstActive.time.slice(0, 2)) * 60 + Number(firstActive.time.slice(3, 5)) : 12 * 60;

  return (
    <div className="max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Service</h1>
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

      {tables.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Aucune table configurée. <Link href="/admin/floor" className="font-medium underline">Créer le plan de salle</Link>{" "}
          (la configuration rapide prend 30 secondes).
        </p>
      ) : (
        <ServiceBoard
          key={date}
          date={date}
          isToday={date === today}
          rooms={rooms}
          tables={tables}
          reservations={reservations}
          initialTime={initialTime}
        />
      )}
    </div>
  );
}
