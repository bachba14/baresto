import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getRestaurantBySlug } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { CORS_HEADERS } from "@/lib/cors";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: NextRequest, ctx: RouteContext<"/api/r/[slug]/reservations">) {
  const fail = (error: string, status = 400) =>
    NextResponse.json({ error }, { status, headers: CORS_HEADERS });

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

  const { data, error } = await createPublicClient().rpc("create_reservation", {
    p_restaurant: restaurant.id,
    p_date: date,
    p_time: time,
    p_party_size: Number(body.party_size),
    p_name: str(body.name, 120),
    p_email: str(body.email, 200),
    p_phone: str(body.phone, 40),
    p_notes: str(body.notes, 1000),
  });

  if (error) {
    // P0001 = erreurs métier levées par la fonction SQL, au message lisible.
    return error.code === "P0001" ? fail(error.message, 409) : fail("Une erreur est survenue, réessayez.", 500);
  }

  const row = (data as { id: string; status: string }[])[0];
  return NextResponse.json({ ok: true, id: row.id, status: row.status }, { status: 201, headers: CORS_HEADERS });
}
