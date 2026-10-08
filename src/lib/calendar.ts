import { zonedToUtc } from "./format";
import type { Reservation, Restaurant } from "./types";

export type CalendarLinks = { google: string; outlook: string; apple: string };

/** Durée du repas : celle de la réservation, sinon celle du service (midi / soir) du restaurant. */
export function mealMinutes(restaurant: Restaurant, time: string, duration?: number | null) {
  if (duration) return duration;
  return time.slice(0, 5) >= restaurant.dinner_from.slice(0, 5) ? restaurant.dinner_minutes : restaurant.lunch_minutes;
}

/** Début et fin du repas (instants UTC), avec le titre et le lieu de l'événement. */
export function calendarEvent(
  r: Pick<Reservation, "date" | "time" | "party_size" | "name"> & { duration_minutes?: number | null },
  restaurant: Restaurant,
) {
  const start = zonedToUtc(r.date, r.time, restaurant.timezone);
  const end = new Date(start.getTime() + mealMinutes(restaurant, r.time, r.duration_minutes) * 60_000);
  return {
    start,
    end,
    title: `${restaurant.name} — ${r.party_size} pers.`,
    location: [restaurant.address, restaurant.city].filter(Boolean).join(", "),
    details: `Réservation au nom de ${r.name}.${restaurant.phone ? ` Tél. ${restaurant.phone}` : ""}`,
  };
}

/** 2026-10-15T18:00:00.000Z → 20261015T180000Z */
const compact = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Liens « Ajouter à mon agenda » : Google Agenda, Outlook (web) et Apple / autres (fichier .ics). */
export function calendarLinks(
  r: Pick<Reservation, "date" | "time" | "party_size" | "name" | "token"> & { duration_minutes?: number | null },
  restaurant: Restaurant,
  base: string,
): CalendarLinks {
  const e = calendarEvent(r, restaurant);
  const google = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.start)}/${compact(e.end)}`,
    details: e.details,
    location: e.location,
  });
  const outlook = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    body: e.details,
    location: e.location,
  });
  return {
    google: `https://calendar.google.com/calendar/render?${google}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlook}`,
    apple: `${base}/reservation/${r.token}/ics`,
  };
}
