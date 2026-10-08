"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { parseList } from "@/lib/format";

export async function saveCustomer(id: string, _: string | null, formData: FormData): Promise<string | null> {
  const { supabase, restaurant } = await requireRestaurantAction();
  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const email = text("email")?.toLowerCase() ?? null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Adresse e-mail invalide.";
  const phone = text("phone");
  // Même clé que phone_key() en SQL : les 9 derniers chiffres.
  const digits = phone?.replace(/\D/g, "") ?? "";

  const { error } = await supabase
    .from("customers")
    .update({
      name: text("name") ?? "Client",
      email,
      phone,
      phone_key: digits.length >= 6 ? digits.slice(-9) : null,
      notes: text("notes"),
      tags: parseList(formData.get("tags")).slice(0, 10),
    })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  if (error) return error.code === "23505" ? "Un autre client a déjà cette adresse e-mail." : error.message;
  revalidatePath("/admin", "layout");
  return "ok";
}
