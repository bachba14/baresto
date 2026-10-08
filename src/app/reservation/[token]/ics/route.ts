import type { NextRequest } from "next/server";
import { getReservationByToken } from "@/lib/data";
import { calendarEvent } from "@/lib/calendar";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const text = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");

/** Fichier agenda (.ics) de la réservation : Apple Calendar, Outlook bureau, Thunderbird… */
export async function GET(_: NextRequest, ctx: RouteContext<"/reservation/[token]/ics">) {
  const found = await getReservationByToken((await ctx.params).token);
  if (!found) return new Response("Réservation introuvable.", { status: 404 });
  const { reservation: r, restaurant } = found;

  const { start, end, title, location, details } = calendarEvent(r, restaurant);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baresto//Reservation//FR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@baresto`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(title)}`,
    ...(location ? [`LOCATION:${text(location)}`] : []),
    `DESCRIPTION:${text(details)}`,
    r.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // « inline » : sur iPhone et Mac, ouvre directement la fenêtre d'ajout du Calendrier.
      "Content-Disposition": `inline; filename="reservation-${restaurant.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
