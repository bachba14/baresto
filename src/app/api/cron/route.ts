import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emailEnabled } from "@/lib/email";
import { emailClient, emailReview } from "@/lib/notifications";
import { notifyWaitlist } from "@/lib/waitlist";
import { purgeDeletedRestaurants } from "@/lib/purge";
import { recordError, recordOk } from "@/lib/health";
import { siteUrl } from "@/lib/site";
import type { Reservation, Restaurant } from "@/lib/types";

// Tâche programmée (toutes les 15 min, via pg_cron de Supabase ou cron-job.org) :
// rappels avant le repas, demandes d'avis le lendemain, liste d'attente.
// Protégée par CRON_SECRET : en-tête « Authorization: Bearer … » ou paramètre ?key=…

/** Comparaison en temps constant (les empreintes ont toujours la même longueur). */
function sameSecret(a: string, b: string) {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

async function run(request: NextRequest) {
  try {
    return await tasks(request);
  } catch (e) {
    await recordError("cron", (e as Error).message);
    return NextResponse.json({ error: "Erreur pendant la tâche programmée." }, { status: 500 });
  }
}

async function tasks(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? request.nextUrl.searchParams.get("key");
  if (!secret || !given || !sameSecret(given, secret)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SECRET_KEY manquante." }, { status: 500 });
  // Suppressions définitives (RGPD), indépendantes de l'envoi d'e-mails.
  const purged = await purgeDeletedRestaurants(supabase).catch((e: Error) => {
    console.error("[purge]", e.message);
    return 0;
  });
  // Journal des erreurs serveur : 30 jours.
  await supabase.from("app_errors").delete().lt("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
  if (!emailEnabled()) {
    await recordError("cron", "Envoi d'e-mails non configuré (EMAIL_FROM + RESEND_API_KEY).");
    return NextResponse.json({ error: "Envoi d'e-mails non configuré (EMAIL_FROM + RESEND_API_KEY).", purged }, { status: 500 });
  }

  const base = await siteUrl();
  const [{ data: reminders, error: e1 }, { data: reviews, error: e2 }] = await Promise.all([
    supabase.rpc("due_reminders"),
    supabase.rpc("due_review_requests"),
  ]);
  if (e1 || e2) {
    await recordError("cron", (e1 ?? e2)!.message);
    return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });
  }

  const due = [...(reminders as Reservation[]), ...(reviews as Reservation[])];
  const ids = [...new Set(due.map((r) => r.restaurant_id))];
  const { data: restaurants } = ids.length
    ? await supabase.from("restaurants").select("*").in("id", ids)
    : { data: [] };
  const byId = new Map((restaurants as Restaurant[]).map((r) => [r.id, r]));
  const now = () => new Date().toISOString();

  let sentReminders = 0;
  for (const r of reminders as Reservation[]) {
    const restaurant = byId.get(r.restaurant_id);
    if (restaurant && (await emailClient("reminder", r, restaurant, base))) {
      await supabase.from("reservations").update({ reminder_sent_at: now() }).eq("id", r.id);
      sentReminders++;
    }
  }

  let sentReviews = 0;
  for (const r of reviews as Reservation[]) {
    const restaurant = byId.get(r.restaurant_id);
    if (restaurant && (await emailReview(r, restaurant))) {
      await supabase.from("reservations").update({ review_requested_at: now() }).eq("id", r.id);
      sentReviews++;
    }
  }

  const sentWaitlist = await notifyWaitlist(base);
  await recordOk("cron");
  return NextResponse.json({ reminders: sentReminders, reviews: sentReviews, waitlist: sentWaitlist, purged });
}

export const GET = run;
export const POST = run;
