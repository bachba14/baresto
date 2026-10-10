import type { Metadata } from "next";
import { requireRestaurant } from "@/lib/data";
import { formatDate, formatTime, isValidDate, todayIn } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Feuille de service", robots: { index: false } };

type Row = Reservation & {
  reservation_tables: { dining_tables: { label: string } | null }[];
  customers: { notes: string | null; tags: string[]; reservation_count: number; no_show_count: number } | null;
};

/** Feuille de service imprimable : réservations du jour, midi puis soir. */
export default async function PrintPage({ searchParams }: PageProps<"/admin/print">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const date = isValidDate(params.date) ? params.date : todayIn(restaurant.timezone);

  const { data } = await supabase
    .from("reservations")
    .select("*, reservation_tables(dining_tables(label)), customers(notes, tags, reservation_count, no_show_count)")
    .eq("restaurant_id", restaurant.id)
    .eq("date", date)
    .in("status", ["pending", "confirmed", "seated", "finished"])
    .order("time");
  const rows = (data ?? []) as Row[];
  const services = [
    { title: "Midi", rows: rows.filter((r) => r.time < restaurant.dinner_from) },
    { title: "Soir", rows: rows.filter((r) => r.time >= restaurant.dinner_from) },
  ].filter((s) => s.rows.length > 0);

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-sm text-black print:p-0">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{restaurant.name} — Feuille de service</h1>
          <p className="first-letter:uppercase">
            {formatDate(date)} · {rows.length} réservations · {rows.reduce((n, r) => n + r.party_size, 0)} couverts
          </p>
        </div>
        <PrintButton />
      </div>

      {services.length === 0 && <p>Aucune réservation ce jour.</p>}

      {services.map((s) => (
        <section key={s.title} className="mb-6 break-inside-avoid-page">
          <h2 className="mb-1 border-b-2 border-black text-base font-bold">
            {s.title} · {s.rows.reduce((n, r) => n + r.party_size, 0)} couverts
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="w-6 py-1"></th>
                <th className="py-1 pr-2">Heure</th>
                <th className="py-1 pr-2">Pers.</th>
                <th className="py-1 pr-2">Nom</th>
                <th className="py-1 pr-2">Table</th>
                <th className="py-1 pr-2">Téléphone</th>
                <th className="py-1">Remarques</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => {
                const c = r.customers;
                const info = [
                  ...(c?.tags ?? []),
                  c && c.reservation_count >= 3 ? `habitué (${c.reservation_count})` : null,
                  c?.no_show_count ? `${c.no_show_count} no-show` : null,
                  r.status === "pending" ? "à confirmer" : null,
                ].filter(Boolean);
                return (
                  <tr key={r.id} className="break-inside-avoid border-b border-stone-300 align-top">
                    <td className="py-1.5"><span className="inline-block h-3.5 w-3.5 border border-black" /></td>
                    <td className="py-1.5 pr-2 font-semibold">{formatTime(r.time)}</td>
                    <td className="py-1.5 pr-2 font-semibold">{r.party_size}</td>
                    <td className="py-1.5 pr-2">
                      {r.name}
                      {info.length > 0 && <div className="text-xs">{info.join(" · ")}</div>}
                    </td>
                    <td className="py-1.5 pr-2">{r.reservation_tables.map((t) => t.dining_tables?.label).filter(Boolean).join("+") || "—"}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{r.phone}</td>
                    <td className="py-1.5">
                      {r.notes}
                      {c?.notes && <div className="text-xs italic">Fiche : {c.notes}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
