"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getReservationByToken } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { emailClient, emailRestaurant } from "@/lib/notifications";
import { notifyWaitlist } from "@/lib/waitlist";
import { siteUrl } from "@/lib/site";
import type { ReservationStatus, Slot } from "@/lib/types";

/** Créneaux disponibles pour déplacer la réservation (sa propre place comptée comme libre). */
export async function loadSlots(token: string, date: string, party: number) {
  if (!isValidDate(date)) return [];
  const { data } = await createPublicClient().rpc("availability_for_token", {
    p_token: token,
    p_date: date,
    p_party_size: party,
  });
  return ((data as Slot[] | null) ?? []).map((s) => ({ time: s.slot.slice(0, 5), remaining: s.remaining }));
}

export async function cancelReservation(token: string): Promise<string | null> {
  const before = await getReservationByToken(token);
  if (!before) return "Réservation introuvable.";
  const { error } = await createPublicClient().rpc("cancel_reservation_by_token", { p_token: token });
  if (error) return error.code === "P0001" ? error.message : "Une erreur est survenue, réessayez.";

  const { reservation, restaurant } = before;
  const r = { ...reservation, status: "cancelled" as ReservationStatus };
  const base = await siteUrl();
  after(() =>
    Promise.all([
      emailClient("cancelled", r, restaurant, base),
      emailRestaurant("cancelled", r, restaurant, base),
      // La table libérée peut servir à quelqu'un en liste d'attente.
      notifyWaitlist(base, { restaurantId: restaurant.id, date: r.date }),
    ]),
  );
  revalidatePath(`/reservation/${token}`);
  return null;
}

export async function modifyReservation(token: string, date: string, time: string, party: number): Promise<string | null> {
  if (!isValidDate(date) || !/^\d{2}:\d{2}$/.test(time)) return "Date ou heure invalide.";
  const before = await getReservationByToken(token);
  if (!before) return "Réservation introuvable.";

  const { data: status, error } = await createPublicClient().rpc("modify_reservation_by_token", {
    p_token: token,
    p_date: date,
    p_time: time,
    p_party_size: party,
  });
  if (error) return error.code === "P0001" ? error.message : "Une erreur est survenue, réessayez.";

  const { reservation, restaurant } = before;
  const r = { ...reservation, date, time, party_size: party, status: status as ReservationStatus };
  const base = await siteUrl();
  after(() =>
    Promise.all([
      emailClient("modified", r, restaurant, base),
      emailRestaurant("modified", r, restaurant, base),
      notifyWaitlist(base, { restaurantId: restaurant.id, date: reservation.date }),
    ]),
  );
  revalidatePath(`/reservation/${token}`);
  return null;
}
