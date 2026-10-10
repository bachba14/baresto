"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireRestaurantAction } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { emailClient, type ClientEmailKind } from "@/lib/notifications";
import { notifyWaitlist } from "@/lib/waitlist";
import { siteUrl } from "@/lib/site";
import { mealMinutes } from "@/lib/calendar";
import type { Reservation, ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = ["pending", "confirmed", "seated", "finished", "cancelled", "no_show"];

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
        // Table libérée (annulation ou départ des clients) : la liste d'attente peut en profiter.
        (status === "cancelled" || status === "finished") && notifyWaitlist(base, { restaurantId: restaurant.id, date: r.date }),
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

export type EditState = { ok?: string; error?: string } | null;

/**
 * Modification d'une réservation par le restaurant (téléphone, sur place) : date, heure, couverts,
 * coordonnées, remarques. Pas de contrôle de capacité, comme la saisie manuelle ; la réservation est
 * replacée automatiquement si l'horaire ou le nombre de couverts change.
 */
export async function editReservation(id: string, _: EditState, formData: FormData): Promise<EditState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { data: before } = await supabase.from("reservations").select("*").eq("id", id).eq("restaurant_id", restaurant.id).single();
  if (!before) return { error: "Réservation introuvable." };

  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max) || null;
  const date = String(formData.get("date"));
  const time = String(formData.get("time")).slice(0, 5);
  const party = Number(formData.get("party_size"));
  const name = text("name", 120);
  const email = text("email", 200)?.toLowerCase() ?? null;
  if (!isValidDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: "Date ou heure invalide." };
  if (!Number.isInteger(party) || party < 1 || party > 100) return { error: "Nombre de couverts invalide." };
  if (!name || name.length < 2) return { error: "Indiquez le nom du client." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };

  const moved = date !== before.date || time !== before.time.slice(0, 5);
  const resized = party !== before.party_size;
  const { error } = await supabase
    .from("reservations")
    .update({
      date,
      time,
      party_size: party,
      name,
      email,
      phone: text("phone", 40),
      notes: text("notes", 1000),
      // Durée du repas recalculée selon le service (midi / soir) du nouvel horaire.
      ...(moved ? { duration_minutes: mealMinutes(restaurant, time), reminder_sent_at: null } : {}),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Nouvel horaire ou nouveau nombre de couverts : on replace sur la meilleure table libre.
  let placed = true;
  if ((moved || resized) && !["cancelled", "no_show"].includes(before.status)) {
    await supabase.rpc("assign_tables", { p_reservation: id, p_tables: [] });
    const { data: tables } = await supabase.rpc("auto_assign", { p_reservation: id });
    placed = Boolean(tables);
  }

  const base = await siteUrl();
  const r = { ...(before as Reservation), date, time, party_size: party, name, email };
  after(() =>
    Promise.all([
      (moved || resized) && email && formData.get("send_email") === "on" && emailClient("modified", r, restaurant, base),
      // L'ancien créneau s'est libéré (ou le groupe est plus petit) : la liste d'attente peut en profiter.
      (moved || party < before.party_size) && notifyWaitlist(base, { restaurantId: restaurant.id, date: before.date }),
    ]),
  );
  done();
  return { ok: placed ? "Réservation modifiée ✓" : "Modifiée, mais aucune table libre adaptée : placez-la depuis le plan." };
}
