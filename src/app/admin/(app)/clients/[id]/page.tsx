import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRestaurant } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cardClass } from "@/components/admin-styles";
import type { Customer } from "@/lib/types";
import { RESERVATION_SELECT, ReservationRow, type ReservationWithTables } from "../../reservations/reservation-row";
import { CustomerForm } from "./customer-form";

export default async function CustomerPage({ params }: PageProps<"/admin/clients/[id]">) {
  const [{ supabase, restaurant }, { id }] = await Promise.all([requireRestaurant(), params]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [{ data: customer }, { data: history }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).eq("restaurant_id", restaurant.id).maybeSingle(),
    supabase.from("reservations").select(RESERVATION_SELECT).eq("customer_id", id).order("date", { ascending: false }).order("time", { ascending: false }).limit(100),
  ]);
  if (!customer) notFound();
  const c = customer as Customer;
  const reservations = (history ?? []) as ReservationWithTables[];
  const covers = reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show").reduce((n, r) => n + r.party_size, 0);
  const handled = c.reservation_count + c.no_show_count;

  const stats: [string, string | number][] = [
    ["Réservations", c.reservation_count],
    ["Couverts", covers],
    ["No-shows", handled ? `${c.no_show_count} (${Math.round((c.no_show_count / handled) * 100)} %)` : 0],
    ["Annulations", c.cancelled_count],
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-stone-500 hover:underline">← Clients</Link>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-stone-500">
          {c.first_date ? <>Client depuis le {formatDate(c.first_date)}</> : "Aucune réservation honorée pour l'instant"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className={cardClass}>
            <p className="text-xs text-stone-500">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <CustomerForm customer={c} />

      <section className={cardClass}>
        <h2 className="font-semibold">Historique</h2>
        {reservations.length === 0 ? (
          <p className="mt-2 text-stone-500">Aucune réservation.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {reservations.map((r) => <ReservationRow key={r.id} r={r} showDate />)}
          </ul>
        )}
      </section>
    </div>
  );
}
