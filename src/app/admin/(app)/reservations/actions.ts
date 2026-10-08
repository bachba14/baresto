"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireRestaurantAction } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { emailClient, type ClientEmailKind } from "@/lib/notifications";
import { notifyWaitlist } from "@/lib/waitlist";
import { siteUrl } from "@/lib/site";
import type { Reservation, ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = ["pending", "confirmed", "seated", "cancelled", "no_show"];

function done() {
  revalidatePath("/admin", "layout");
}

/** E-mail au client selon le changement de statut décidé par le restaurant. */
function emailFor(from: ReservationStatus, to: ReservationStatus): ClientEmailKind | null {
  if (from === "pending" && to === "confirmed") return "confirmed";
  if (from === "pending" && to === "cancelled") return "refused";
  if (from === "confirmed" && to === "cancelled") return "cancelled";
  return null;
}

export async function updateStatus(id: string, status: ReservationStatus) {
  if (!STATUSES.includes(status)) throw new Error("Statut invalide.");
  const { supabase, restaurant } = await requireRestaurantAction();
  const { data: before } = await supabase.from("reservations").select("*").eq("id", id).single();
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

  if (before) {
    const r = { ...(before as Reservation), status };
    const kind = emailFor(before.status, status);
    const base = await siteUrl();
    after(() =>
      Promise.all([
        kind && emailClient(kind, r, restaurant, base),
        status === "cancelled" && notifyWaitlist(base, { restaurantId: restaurant.id, date: r.date }),
      ]),
    );
  }
  done();
}

export async function deleteReservation(id: string) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { data: deleted, error } = await supabase.from("reservations").delete().eq("id", id).select("date, status").maybeSingle();
  if (error) throw new Error(error.message);
  if (deleted && deleted.status !== "cancelled" && deleted.status !== "no_show") {
    const base = await siteUrl();
    after(() => notifyWaitlist(base, { restaurantId: restaurant.id, date: deleted.date }));
  }
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
  }).select("*").single();
  if (error) throw new Error(error.message);
  // Placement sur la meilleure table libre ; sinon elle apparaît « sans table » dans le service.
  await supabase.rpc("auto_assign", { p_reservation: data.id });

  // Le client reçoit sa confirmation avec le lien pour modifier ou annuler.
  if (data.email && formData.get("send_email") === "on") {
    const base = await siteUrl();
    after(() => emailClient("confirmed", data as Reservation, restaurant, base));
  }
  done();
}

export async function deleteWaitlistEntry(id: string) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { error } = await supabase.from("waitlist").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (error) throw new Error(error.message);
  done();
}
