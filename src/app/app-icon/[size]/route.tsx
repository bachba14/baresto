import { appIcon } from "@/lib/app-icon";

const SIZES = [96, 192, 512];

/** Icônes de l'application installée (manifeste) et des notifications. */
export async function GET(_: Request, ctx: RouteContext<"/app-icon/[size]">) {
  const size = Number((await ctx.params).size);
  if (!SIZES.includes(size)) return new Response("Taille inconnue.", { status: 404 });
  const res = appIcon(size);
  res.headers.set("Cache-Control", "public, max-age=86400");
  return res;
}
