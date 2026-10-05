import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getRestaurantBySlug } from "@/lib/data";
import { isValidDate } from "@/lib/format";
import { CORS_HEADERS } from "@/lib/cors";
import type { Slot } from "@/lib/types";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/r/[slug]/availability">) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: CORS_HEADERS });
  const restaurant = await getRestaurantBySlug((await ctx.params).slug);
  if (!restaurant) return fail("Restaurant introuvable.", 404);

  const date = request.nextUrl.searchParams.get("date");
  const party = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("party")) || 1));
  if (!isValidDate(date)) return fail("Paramètre date invalide (AAAA-MM-JJ).", 400);

  const { data, error } = await createPublicClient().rpc("get_availability", {
    p_restaurant: restaurant.id,
    p_date: date,
    p_party_size: party,
  });
  if (error) return fail("Impossible de charger les disponibilités.", 500);

  const slots = (data as Slot[]).map((s) => ({ time: s.slot.slice(0, 5), remaining: s.remaining }));
  return NextResponse.json({ date, slots }, { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}
