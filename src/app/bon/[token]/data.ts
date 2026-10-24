import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";

export type PublicGiftCard = {
  amount: number;
  offered_by: string | null;
  recipient_name: string | null;
  message: string | null;
  expires_at: string;
  used_at: string | null;
  restaurant_name: string;
  restaurant_slug: string;
  currency: string;
  primary_color: string;
  address: string | null;
  city: string | null;
  phone: string | null;
};

/** Bon cadeau par son lien secret (e-mail), sans l'adresse d'envoi. */
export const getPublicGiftCard = cache(async (token: string) => {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { data } = await createPublicClient().rpc("gift_card_public", { p_token: token });
  return ((data as PublicGiftCard[] | null) ?? [])[0] ?? null;
});
