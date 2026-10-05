"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMyRestaurant, requireRestaurantAction } from "@/lib/data";
import { createPublicClient } from "@/lib/supabase/server";
import type { OpeningHours } from "@/lib/types";

const SLUG = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export type StepState = { error?: string } | null;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

/** Disponibilité d'une adresse publique (/r/…). */
export async function checkSlug(slug: string): Promise<"ok" | "taken" | "invalid"> {
  if (!SLUG.test(slug)) return "invalid";
  const { data } = await createPublicClient().from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!data) return "ok";
  const { restaurant } = await getMyRestaurant();
  return restaurant?.id === data.id ? "ok" : "taken";
}

// 1. Le restaurant
export async function saveRestaurantStep(_: StepState, formData: FormData): Promise<StepState> {
  const { supabase, restaurant } = await getMyRestaurant();
  const name = text(formData, "name");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || name.length < 2) return { error: "Indiquez le nom de votre restaurant." };
  if (!SLUG.test(slug)) return { error: "Adresse invalide : lettres minuscules, chiffres et tirets." };

  let id = restaurant?.id;
  if (!id) {
    const { data, error } = await supabase.rpc("create_restaurant", { p_name: name, p_slug: slug });
    if (error) return { error: error.code === "P0001" ? error.message : "Création impossible, réessayez." };
    id = data as string;
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      slug,
      cuisine: text(formData, "cuisine"),
      city: text(formData, "city"),
      address: text(formData, "address"),
      phone: text(formData, "phone"),
      email: text(formData, "email"),
    })
    .eq("id", id);
  if (error) return { error: error.code === "23505" ? "Cette adresse est déjà prise." : error.message };
  redirect("/onboarding?step=2");
}

// 2. Horaires
export async function saveHoursStep(hours: OpeningHours, slotMinutes: number): Promise<StepState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  for (const ranges of Object.values(hours)) {
    for (const r of ranges) {
      if (!TIME.test(r.start) || !TIME.test(r.end) || r.end < r.start) return { error: `Service mal défini : ${r.start} → ${r.end}.` };
    }
  }
  if (![15, 30, 60].includes(slotMinutes)) return { error: "Intervalle invalide." };
  const { error } = await supabase
    .from("restaurants")
    .update({ opening_hours: hours, slot_minutes: slotMinutes })
    .eq("id", restaurant.id);
  if (error) return { error: error.message };
  redirect("/onboarding?step=3");
}

// 3. Tables : sans plan, une simple limite de couverts par créneau
export async function skipTablesStep(maxCovers: number): Promise<StepState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  if (!(maxCovers >= 1 && maxCovers <= 1000)) return { error: "Nombre de couverts invalide." };
  const { error } = await supabase.from("restaurants").update({ max_covers_per_slot: maxCovers }).eq("id", restaurant.id);
  if (error) return { error: error.message };
  redirect("/onboarding?step=4");
}

// 4. Carte
export async function menuStep(withExample: boolean): Promise<StepState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  if (withExample) {
    const { count } = await supabase
      .from("menu_categories")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id);
    if (!count) {
      const { error } = await supabase.rpc("seed_example_menu", { p_restaurant: restaurant.id });
      if (error) return { error: error.message };
    }
  }
  redirect("/onboarding?step=5");
}

// 5. Règles de réservation → fin
export async function finishStep(_: StepState, formData: FormData): Promise<StepState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  const int = (k: string, min: number, max: number) => {
    const n = Number(formData.get(k));
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const maxParty = int("max_party_size", 1, 50);
  const notice = int("min_notice_minutes", 0, 10080);
  const ahead = int("booking_days_ahead", 0, 365);
  const color = String(formData.get("primary_color"));
  if (maxParty === null || notice === null || ahead === null) return { error: "Vérifiez les valeurs saisies." };
  if (!/^#[0-9a-f]{6}$/i.test(color)) return { error: "Couleur invalide." };

  const { error } = await supabase
    .from("restaurants")
    .update({
      auto_confirm: formData.get("auto_confirm") === "on",
      max_party_size: maxParty,
      min_notice_minutes: notice,
      booking_days_ahead: ahead,
      primary_color: color,
      onboarding_completed: true,
    })
    .eq("id", restaurant.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/onboarding/done");
}
