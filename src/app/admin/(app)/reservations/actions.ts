"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import type { ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = ["pending", "confirmed", "seated", "cancelled", "no_show"];

function done() {
  revalidatePath("/admin", "layout");
}

export async function updateStatus(id: string, status: ReservationStatus) {
  if (!STATUSES.includes(status)) throw new Error("Statut invalide.");
  const { supabase } = await requireRestaurantAction();
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  // Une réservation réactivée (après annulation) reprend une table si possible.
  if (status !== "cancelled" && status !== "no_show") {
    const { count } = await supabase
      .from("reservation_tables")
      .select("*", { count: "exact", head: true })
      .eq("reservation_id", id);
    if (count === 0) await supabase.rpc("auto_assign", { p_reservation: id });
  }
  done();
}

export async function deleteReservation(id: string) {
  const { supabase } = await requireRestaurantAction();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  done();
}

/** Saisie manuelle (téléphone, sur place) : pas de contrôle de capacité. */
export async function createReservation(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  if (!isValidDate(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Date ou heure invalide.");

  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const { data, error } = await supabase.from("reservations").insert({
    restaurant_id: restaurant.id,
    date,
    time,
    party_size: Number(formData.get("party_size")) || 1,
    name: text("name") ?? "Sans nom",
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    status: "confirmed",
    source: "admin",
  }).select("id").single();
  if (error) throw new Error(error.message);
  // Placement sur la meilleure table libre ; sinon elle apparaît « sans table » dans le service.
  await supabase.rpc("auto_assign", { p_reservation: data.id });
  done();
}
