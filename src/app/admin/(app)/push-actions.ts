"use server";

import { requireRestaurantAction } from "@/lib/data";
import { pushEnabled, pushUser } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/server";

type SerializedSubscription = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/**
 * Enregistre l'abonnement de cet appareil pour le membre connecté. Clé secrète : un appareil partagé
 * (tablette du restaurant) peut avoir été abonné par un autre membre, dont la ligne est alors reprise.
 */
export async function savePushSubscription(sub: SerializedSubscription, userAgent: string): Promise<string | null> {
  const { restaurant, userId } = await requireRestaurantAction();
  const supabase = createServiceClient();
  if (!supabase || !pushEnabled()) return "Les notifications ne sont pas encore configurées sur le serveur.";
  const endpoint = sub.endpoint ?? "";
  const { p256dh, auth } = sub.keys ?? {};
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return "Abonnement invalide.";
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    { restaurant_id: restaurant.id, user_id: userId, endpoint, p256dh, auth, user_agent: userAgent.slice(0, 300) },
    { onConflict: "endpoint" },
  );
  return error ? "Activation impossible, réessayez." : null;
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase } = await requireRestaurantAction();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Notification de test sur les appareils du membre connecté. */
export async function sendTestPush(): Promise<string | null> {
  const { restaurant, userId } = await requireRestaurantAction();
  const sent = await pushUser(restaurant.id, userId, {
    title: "Notifications activées ✓",
    body: `Vous serez prévenu des nouvelles réservations de ${restaurant.name}.`,
    url: "/admin",
  });
  return sent > 0 ? null : "Aucune notification envoyée : réactivez les notifications sur cet appareil.";
}
