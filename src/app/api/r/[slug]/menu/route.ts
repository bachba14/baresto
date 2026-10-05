import { NextResponse } from "next/server";
import { getPublicMenu, getRestaurantBySlug } from "@/lib/data";
import { CORS_HEADERS } from "@/lib/cors";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Carte au format JSON, pour une intégration sur mesure. */
export async function GET(_: Request, ctx: RouteContext<"/api/r/[slug]/menu">) {
  const restaurant = await getRestaurantBySlug((await ctx.params).slug);
  if (!restaurant) return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404, headers: CORS_HEADERS });

  const categories = await getPublicMenu(restaurant.id);
  return NextResponse.json(
    { restaurant: restaurant.name, currency: restaurant.currency, categories },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
