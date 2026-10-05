import type { ReservationStatus } from "./types";

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
/** Ordre d'affichage : lundi → dimanche. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  seated: "Installée",
  cancelled: "Annulée",
  no_show: "Non venue",
};

export function formatPrice(price: number | null, currency = "EUR") {
  if (price == null) return "";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(price);
}

/** "19:30:00" → "19h30" */
export function formatTime(time: string) {
  const [h, m] = time.split(":");
  return `${h}h${m}`;
}

/** "2026-10-05" → "lundi 5 octobre 2026" */
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Date du jour (YYYY-MM-DD) dans le fuseau du restaurant. */
export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

/** "végétarien, vegan" → ["végétarien", "vegan"] */
export function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
