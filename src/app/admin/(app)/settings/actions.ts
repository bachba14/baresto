"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { isValidDate } from "@/lib/format";
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

export async function addClosure(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const date = String(formData.get("date"));
  if (!isValidDate(date)) throw new Error("Date invalide.");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const { error } = await supabase.from("closures").upsert({ restaurant_id: restaurant.id, date, reason });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function removeClosure(date: string) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { error } = await supabase.from("closures").delete().eq("restaurant_id", restaurant.id).eq("date", date);
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}
