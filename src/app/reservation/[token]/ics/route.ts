import type { NextRequest } from "next/server";
import { getReservationByToken } from "@/lib/data";
import { zonedToUtc } from "@/lib/format";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const text = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");

/** Fichier agenda (.ics) de la réservation. */
export async function GET(_: NextRequest, ctx: RouteContext<"/reservation/[token]/ics">) {
  const found = await getReservationByToken((await ctx.params).token);
  if (!found) return new Response("Réservation introuvable.", { status: 404 });
  const { reservation: r, restaurant } = found;

  const start = zonedToUtc(r.date, r.time, restaurant.timezone);
  const end = new Date(start.getTime() + (r.duration_minutes ?? 120) * 60_000);
  const location = [restaurant.address, restaurant.city].filter(Boolean).join(", ");
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
    `SUMMARY:${text(`${restaurant.name} — ${r.party_size} pers.`)}`,
    ...(location ? [`LOCATION:${text(location)}`] : []),
    `DESCRIPTION:${text(`Réservation au nom de ${r.name}.${restaurant.phone ? ` Tél. ${restaurant.phone}` : ""}`)}`,
    r.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservation-${restaurant.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
