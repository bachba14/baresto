import { after, NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getRestaurantBySlug } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { CORS_HEADERS } from "@/lib/cors";
import { emailClient, emailRestaurant } from "@/lib/notifications";
import { siteUrl } from "@/lib/site";
import { calendarLinks } from "@/lib/calendar";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rate-limit";
import type { ReservationStatus } from "@/lib/types";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: NextRequest, ctx: RouteContext<"/api/r/[slug]/reservations">) {
  const fail = (error: string, status = 400) =>
    NextResponse.json({ error }, { status, headers: CORS_HEADERS });

  // Anti-spam : 5 réservations par 10 minutes et 15 par jour depuis une même connexion.
  if (rateLimited(`resa:${clientIp(request.headers)}`, [[5, 10 * 60_000], [15, 86_400_000]])) return fail(TOO_MANY, 429);

  const restaurant = await getRestaurantBySlug((await ctx.params).slug);
  if (!restaurant) return fail("Restaurant introuvable.", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Requête invalide.");
  }

  // Champ piège anti-robots : rempli uniquement par les bots.
  if (str(body.website, 200)) return NextResponse.json({ ok: true, status: "pending" }, { headers: CORS_HEADERS });

  const { date, time } = body;
  if (!isValidDate(date)) return fail("Date invalide.");
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) return fail("Heure invalide.");

  const input = {
    party_size: Number(body.party_size),
    name: str(body.name, 120).trim(),
    email: str(body.email, 200).trim() || null,
    phone: str(body.phone, 40).trim() || null,
    notes: str(body.notes, 1000).trim() || null,
  };
  const { data, error } = await createPublicClient().rpc("create_reservation", {
    p_restaurant: restaurant.id,
    p_date: date,
    p_time: time,
    p_party_size: input.party_size,
    p_name: input.name,
    p_email: input.email ?? "",
    p_phone: input.phone ?? "",
    p_notes: input.notes ?? "",
  });

  if (error) {
    // P0001 = erreurs métier levées par la fonction SQL, au message lisible.
    return error.code === "P0001" ? fail(error.message, 409) : fail("Une erreur est survenue, réessayez.", 500);
  }

  const row = (data as { id: string; status: ReservationStatus; token: string }[])[0];
  const base = await siteUrl();
  const reservation = { ...input, date, time, status: row.status, token: row.token };
  // E-mails envoyés après la réponse, pour ne pas faire attendre le client.
  after(() =>
    Promise.all([
      emailClient(row.status === "confirmed" ? "confirmed" : "received", reservation, restaurant, base),
      emailRestaurant("new", reservation, restaurant, base),
    ]),
  );

  return NextResponse.json(
    {
      ok: true,
      id: row.id,
      status: row.status,
      manage_url: `${base}/reservation/${row.token}`,
      calendar: calendarLinks(reservation, restaurant, base),
    },
    { status: 201, headers: CORS_HEADERS },
  );
}
