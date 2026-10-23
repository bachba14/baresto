// Notifications sur téléphone (Web Push) pour l'équipe du restaurant.
// Clés VAPID : NEXT_PUBLIC_VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY. Sans elles, rien n'est envoyé.

import webpush from "web-push";
import { createServiceClient } from "./supabase/server";
import { formatDate, formatTime } from "./format";
import { recordError, recordOk } from "./health";
import type { Reservation, Restaurant } from "./types";

export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;

function configure() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  // Contact demandé par les services de notification (Apple, Google, Mozilla) en cas d'abus.
  const contact = process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? process.env.EMAIL_FROM ?? "contact@monkomi.be"}`;
  configured = Boolean(publicKey && privateKey);
  if (configured) webpush.setVapidDetails(contact, publicKey!, privateKey!);
  return configured;
}

export function pushEnabled() {
  return configure();
}

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

async function send(subs: Subscription[], message: PushMessage) {
  const supabase = createServiceClient();
  if (!supabase || !configure() || subs.length === 0) return 0;
  const payload = JSON.stringify(message);
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        // TTL 1 h : une alerte de réservation n'a plus d'intérêt au-delà.
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
        await recordOk("push");
        return true;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Abonnement expiré ou révoqué (application désinstallée, permission retirée) : on l'oublie.
        if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
        else await recordError("push", `${status ?? "réseau"} : ${(e as Error).message}`);
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}

/** Envoie une notification à tous les appareils abonnés de l'équipe du restaurant. */
export async function pushRestaurant(restaurantId: string, message: PushMessage) {
  const supabase = createServiceClient();
  if (!supabase || !configure()) return 0;
  const { data } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("restaurant_id", restaurantId);
  return send((data ?? []) as Subscription[], message);
}

/** Envoie une notification aux appareils d'un seul membre (test depuis le back-office). */
export async function pushUser(restaurantId: string, userId: string, message: PushMessage) {
  const supabase = createServiceClient();
  if (!supabase || !configure()) return 0;
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId);
  return send((data ?? []) as Subscription[], message);
}

const people = (n: number) => `${n} pers.`;

/** Alerte de l'équipe : nouvelle réservation en ligne, ou modification / annulation par le client. */
export function pushReservation(
  kind: "new" | "modified" | "cancelled",
  r: Pick<Reservation, "date" | "time" | "party_size" | "name" | "status">,
  restaurant: Pick<Restaurant, "id">,
) {
  const when = `${formatDate(r.date)} à ${formatTime(r.time)}`;
  const title = {
    new: r.status === "pending" ? "Nouvelle demande à confirmer" : "Nouvelle réservation",
    modified: "Réservation modifiée",
    cancelled: "Réservation annulée",
  }[kind];
  return pushRestaurant(restaurant.id, {
    title,
    body: `${r.name} · ${people(r.party_size)} · ${when}`,
    url: `/admin/reservations?date=${r.date}`,
  });
}
