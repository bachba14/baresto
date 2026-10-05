"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { isValidDate } from "@/lib/format";

function done() {
  revalidatePath("/admin", "layout");
}

/** Place une réservation sur des tables (liste vide = la retirer du plan). */
export async function assignTables(reservationId: string, tableIds: string[]): Promise<string | null> {
  const { supabase } = await requireRestaurantAction();
  const { error } = await supabase.rpc("assign_tables", { p_reservation: reservationId, p_tables: tableIds });
  if (error) return error.code === "P0001" ? error.message : "Placement impossible.";
  done();
  return null;
}

export async function autoAssign(reservationId: string): Promise<string | null> {
  const { supabase } = await requireRestaurantAction();
  const { data, error } = await supabase.rpc("auto_assign", { p_reservation: reservationId });
  if (error) return error.code === "P0001" ? error.message : "Placement impossible.";
  done();
  return data ? null : "Aucune table libre adaptée à ce groupe sur ce créneau.";
}

/** Place automatiquement toutes les réservations du jour qui n'ont pas de table. */
export async function autoAssignAll(date: string): Promise<{ placed: number; failed: number }> {
  if (!isValidDate(date)) throw new Error("Date invalide.");
  const { supabase, restaurant } = await requireRestaurantAction();
  const { data } = await supabase
    .from("reservations")
    .select("id, reservation_tables(table_id)")
    .eq("restaurant_id", restaurant.id)
    .eq("date", date)
    .in("status", ["pending", "confirmed", "seated"])
    .order("time")
    .order("party_size", { ascending: false });

  let placed = 0;
  let failed = 0;
  for (const r of data ?? []) {
    if (r.reservation_tables.length > 0) continue;
    const { data: tables } = await supabase.rpc("auto_assign", { p_reservation: r.id });
    if (tables) placed++;
    else failed++;
  }
  done();
  return { placed, failed };
}
