import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { emailEnabled } from "@/lib/email";
import { healthReport } from "@/lib/health";
import { pushEnabled } from "@/lib/push";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// Bulletin de santé pour un service de surveillance externe : 200 si tout va bien, 503 sinon.
// Le détail des problèmes n'est donné qu'avec la clé de la tâche programmée (?key=CRON_SECRET).

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string) {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (rateLimited(`sante:${clientIp(request.headers)}`, [[60, 60_000]])) {
    return NextResponse.json({ status: "trop de requêtes" }, { status: 429, headers });
  }

  const problems = await healthReport({ emailConfigured: emailEnabled(), pushConfigured: pushEnabled() }).catch((e: Error) => [
    `Bulletin indisponible : ${e.message}`,
  ]);
  const secret = process.env.CRON_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  const detailed = Boolean(secret && key && sameSecret(key, secret));

  return NextResponse.json(
    { status: problems.length ? "problème" : "ok", checked_at: new Date().toISOString(), ...(detailed ? { problems } : {}) },
    { status: problems.length ? 503 : 200, headers },
  );
}
