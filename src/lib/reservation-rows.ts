import type { createClient } from "./supabase/server";
import type { Reservation } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type StatRow = Pick<
  Reservation,
  "id" | "date" | "time" | "party_size" | "status" | "source" | "created_at" | "customer_id" | "name"
>;

/**
 * Réservations d'une période (dates incluses), toutes pages confondues :
 * l'API Supabase renvoie au plus 1 000 lignes par requête.
 */
export async function fetchReservationRows(supabase: Supabase, restaurantId: string, from: string, to: string) {
  const rows: StatRow[] = [];
  for (let offset = 0; offset < 100_000; offset += 1000) {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, date, time, party_size, status, source, created_at, customer_id, name")
      .eq("restaurant_id", restaurantId)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data as StatRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

export const isKept = (r: Pick<Reservation, "status">) => r.status !== "cancelled" && r.status !== "no_show";
