import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getRestaurantBySlug } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { CORS_HEADERS } from "@/lib/cors";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rate-limit";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Inscription sur la liste d'attente d'une date complète. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/r/[slug]/waitlist">) {
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: CORS_HEADERS });

  if (rateLimited(`attente:${clientIp(request.headers)}`, [[5, 10 * 60_000], [15, 86_400_000]])) return fail(TOO_MANY, 429);

  const restaurant = await getRestaurantBySlug((await ctx.params).slug);
  if (!restaurant) return fail("Restaurant introuvable.", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Requête invalide.");
  }
  if (str(body.website, 200)) return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });

  const { date, time } = body;
  if (!isValidDate(date)) return fail("Date invalide.");
  if (time != null && time !== "" && (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time))) return fail("Heure invalide.");

  const { error } = await createPublicClient().rpc("join_waitlist", {
    p_restaurant: restaurant.id,
    p_date: date,
    p_time: time || null,
    p_party_size: Number(body.party_size),
    p_name: str(body.name, 120),
    p_email: str(body.email, 200),
    p_phone: str(body.phone, 40),
  });
  if (error) return error.code === "P0001" ? fail(error.message, 409) : fail("Une erreur est survenue, réessayez.", 500);

  return NextResponse.json({ ok: true }, { status: 201, headers: CORS_HEADERS });
}
