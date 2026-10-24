"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction, requireRestaurantAction } from "@/lib/data";
import { addDays, todayIn } from "@/lib/format";
import { parseAmount } from "@/lib/gift-cards";
import { emailGiftCard } from "@/lib/notifications";
import { siteUrl } from "@/lib/site";
import type { GiftCard } from "@/lib/types";

export type GiftState = { ok?: string; error?: string; token?: string } | null;

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const done = () => revalidatePath("/admin/bons");

/** Date de fin : aujourd'hui + la validité du restaurant (en mois, 12 minimum). */
function expiryDate(timezone: string, months: number) {
  const today = todayIn(timezone);
  const [y, m, d] = today.split("-").map(Number);
  const end = new Date(Date.UTC(y, m - 1 + months, d));
  // 31 janvier + 1 mois → fin février, pas début mars.
  if (end.getUTCDate() !== d) end.setUTCDate(0);
  return end.toISOString().slice(0, 10) > today ? end.toISOString().slice(0, 10) : addDays(today, 365);
}

/** Nouveau bon (vendu au comptoir ou par téléphone), envoyé par e-mail si une adresse est donnée. */
export async function createGiftCard(_: GiftState, formData: FormData): Promise<GiftState> {
  const { supabase, restaurant, userId } = await requireRestaurantAction();
  const amount = parseAmount(formData.get("amount"));
  if (!amount || amount > 10000) return { error: "Indiquez un montant entre 1 et 10 000." };
  const email = text(formData, "send_email", 200).toLowerCase();
  if (email && !isEmail(email)) return { error: "Adresse e-mail invalide." };

  const { data, error } = await supabase
    .from("gift_cards")
    .insert({
      restaurant_id: restaurant.id,
      amount,
      offered_by: text(formData, "offered_by", 120) || null,
      recipient_name: text(formData, "recipient_name", 120) || null,
      message: text(formData, "message", 500) || null,
      send_email: email || null,
      expires_at: expiryDate(restaurant.timezone, restaurant.gift_card_months ?? 12),
      created_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) return { error: "Création impossible, réessayez." };
  const card = data as GiftCard;

  const sent = email ? await emailGiftCard(email, card, restaurant, await siteUrl()) : false;
  done();
  return {
    ok: sent ? `Bon créé et envoyé à ${email}.` : email ? "Bon créé, mais l'e-mail n'a pas pu partir : imprimez-le ou renvoyez-le depuis la liste." : "Bon créé.",
    token: card.token,
  };
}

/** Bon présenté au restaurant : marqué utilisé (ou remis valable en cas d'erreur). */
export async function setGiftCardUsed(id: string, used: boolean) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { error } = await supabase
    .from("gift_cards")
    .update({ used_at: used ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  if (error) throw new Error(error.message);
  done();
}

/** Renvoie le bon par e-mail. */
export async function resendGiftCard(id: string, _: GiftState, formData: FormData): Promise<GiftState> {
  const { supabase, restaurant } = await requireRestaurantAction();
  const email = text(formData, "email", 200).toLowerCase();
  if (!isEmail(email)) return { error: "Adresse e-mail invalide." };
  const { data } = await supabase.from("gift_cards").select("*").eq("id", id).eq("restaurant_id", restaurant.id).maybeSingle();
  if (!data) return { error: "Bon introuvable." };
  const sent = await emailGiftCard(email, data as GiftCard, restaurant, await siteUrl());
  return sent ? { ok: `Envoyé à ${email}.` } : { error: "L'e-mail n'a pas pu partir, réessayez." };
}

/** Suppression (erreur de saisie, remboursement) : administrateurs. */
export async function deleteGiftCard(id: string) {
  const { supabase, restaurant } = await requireAdminAction();
  const { error } = await supabase.from("gift_cards").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (error) throw new Error(error.message);
  done();
}

/** Validité des nouveaux bons (administrateurs) : 12 mois minimum en Belgique. */
export async function setGiftCardMonths(_: GiftState, formData: FormData): Promise<GiftState> {
  const { supabase, restaurant } = await requireAdminAction();
  const months = Number(formData.get("months"));
  if (!Number.isInteger(months) || months < 12 || months > 60) return { error: "Entre 12 et 60 mois." };
  const { error } = await supabase.from("restaurants").update({ gift_card_months: months }).eq("id", restaurant.id);
  if (error) return { error: "Enregistrement impossible, réessayez." };
  done();
  return { ok: "Enregistré : s'applique aux prochains bons." };
}
