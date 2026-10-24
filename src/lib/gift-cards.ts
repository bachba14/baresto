import type { GiftCard } from "./types";

export type GiftCardState = "active" | "used" | "expired";

/** État affiché d'un bon : utilisé, expiré (date du jour du restaurant) ou valable. */
export function giftCardState(card: Pick<GiftCard, "used_at" | "expires_at">, today: string): GiftCardState {
  if (card.used_at) return "used";
  if (card.expires_at < today) return "expired";
  return "active";
}

export const GIFT_STATE_LABELS: Record<GiftCardState, string> = {
  active: "Valable",
  used: "Utilisé",
  expired: "Expiré",
};

export const GIFT_STATE_STYLES: Record<GiftCardState, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  used: "bg-stone-100 text-stone-600 ring-stone-200",
  expired: "bg-amber-50 text-amber-800 ring-amber-200",
};

/** Montant saisi en français (« 12,50 ») → nombre, ou null. */
export function parseAmount(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
