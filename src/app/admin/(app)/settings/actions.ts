"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { addDays, isValidDate } from "@/lib/format";
import type { OpeningHours } from "@/lib/types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseHours(raw: string): OpeningHours {
  const parsed = JSON.parse(raw) as OpeningHours;
  const hours: OpeningHours = {};
  for (let d = 0; d < 7; d++) {
    hours[d] = (parsed[d] ?? []).filter((r) => {
      if (!TIME.test(r.start) || !TIME.test(r.end)) throw new Error("Horaire invalide.");
      if (r.end < r.start) throw new Error(`Service mal défini : ${r.start} → ${r.end}.`);
      return true;
    });
  }
  return hours;
}

export async function saveSettings(_: string | null, formData: FormData): Promise<string | null> {
  try {
    const { supabase, restaurant } = await requireRestaurantAction();
    const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
    const int = (k: string) => {
      const n = Number(formData.get(k));
      if (!Number.isInteger(n) || n < 0) throw new Error(`Valeur invalide : ${k}.`);
      return n;
    };
    const color = String(formData.get("primary_color"));
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Couleur invalide.");
    const reviewUrl = text("review_url");
    if (reviewUrl && !/^https:\/\/\S+$/.test(reviewUrl)) throw new Error("Le lien d'avis doit commencer par https://");

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: text("name") ?? "Mon Restaurant",
        tagline: text("tagline"),
        phone: text("phone"),
        email: text("email"),
        address: text("address"),
        primary_color: color,
        reservation_message: text("reservation_message"),
        slot_minutes: int("slot_minutes"),
        max_covers_per_slot: int("max_covers_per_slot"),
        max_party_size: int("max_party_size"),
        booking_days_ahead: int("booking_days_ahead"),
        min_notice_minutes: int("min_notice_minutes"),
        lunch_minutes: int("lunch_minutes"),
        dinner_minutes: int("dinner_minutes"),
        dinner_from: TIME.test(String(formData.get("dinner_from")).slice(0, 5)) ? String(formData.get("dinner_from")).slice(0, 5) : "16:00",
        auto_confirm: formData.get("auto_confirm") === "on",
        send_reminders: formData.get("send_reminders") === "on",
        cancel_deadline_hours: Math.min(int("cancel_deadline_hours"), 168),
        review_url: reviewUrl,
        opening_hours: parseHours(String(formData.get("opening_hours"))),
      })
      .eq("id", restaurant.id);
    if (error) throw new Error(error.message);
  } catch (e) {
    return e instanceof Error ? e.message : "Erreur inconnue.";
  }
  revalidatePath("/", "layout");
  return "ok";
}

export type ClosureState = { error?: string; ok?: string } | null;

/**
 * Ajoute une fermeture sur un jour ou une période (un enregistrement par jour) :
 * journée entière, midi, soir, ou plage horaire personnalisée.
 */
export async function addClosure(_: ClosureState, formData: FormData): Promise<ClosureState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  const from = String(formData.get("date"));
  const toRaw = String(formData.get("date_to") ?? "");
  if (!isValidDate(from)) return { error: "Date invalide." };
  const to = isValidDate(toRaw) && toRaw >= from ? toRaw : from;

  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push(d);
    if (days.length > 92) return { error: "Période trop longue (3 mois maximum)." };
  }

  const dinner = restaurant.dinner_from.slice(0, 5);
  const mode = String(formData.get("mode"));
  let start: string | null = null;
  let end: string | null = null;
  if (mode === "lunch") end = dinner;
  else if (mode === "dinner") start = dinner;
  else if (mode === "custom") {
    start = String(formData.get("start_time") ?? "").slice(0, 5) || null;
    end = String(formData.get("end_time") ?? "").slice(0, 5) || null;
    if ((start && !TIME.test(start)) || (end && !TIME.test(end))) return { error: "Horaire invalide." };
    if (!start && !end) return { error: "Indiquez au moins une heure de début ou de fin." };
    if (start && end && start >= end) return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200) || null;
  const { error } = await supabase
    .from("closures")
    .insert(days.map((date) => ({ restaurant_id: restaurant.id, date, start_time: start, end_time: end, reason })));
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: days.length > 1 ? `${days.length} jours fermés ✓` : "Fermeture ajoutée ✓" };
}

/** Fermeture d'un jour férié en un clic (journée entière). */
export async function closeHoliday(date: string, name: string) {
  if (!isValidDate(date)) throw new Error("Date invalide.");
  const { supabase, restaurant } = await requireRestaurantAction();
  const { error } = await supabase
    .from("closures")
    .insert({ restaurant_id: restaurant.id, date, reason: name.slice(0, 200) });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function removeClosure(id: string) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { error } = await supabase.from("closures").delete().eq("restaurant_id", restaurant.id).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}
