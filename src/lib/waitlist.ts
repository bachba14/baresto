import { createServiceClient } from "./supabase/server";
import { emailWaitlist } from "./notifications";
import { addDays } from "./format";
import type { Restaurant, Slot, WaitlistEntry } from "./types";

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Prévient par e-mail les personnes en liste d'attente dès qu'un créneau leur convient
 * (même service : ± 1 h autour de l'horaire souhaité). Chacune n'est prévenue qu'une fois.
 * Sans filtre : tous les restaurants (tâche programmée). Renvoie le nombre d'e-mails envoyés.
 */
export async function notifyWaitlist(base: string, filter?: { restaurantId: string; date?: string }) {
  const supabase = createServiceClient();
  if (!supabase) return 0;

  let query = supabase
    .from("waitlist")
    .select("*")
    .eq("status", "waiting")
    .gte("date", addDays(new Date().toISOString().slice(0, 10), -1))
    .order("created_at")
    .limit(300);
  if (filter) query = query.eq("restaurant_id", filter.restaurantId);
  if (filter?.date) query = query.eq("date", filter.date);
  const { data: entries } = await query;
  if (!entries?.length) return 0;

  const ids = [...new Set(entries.map((e) => e.restaurant_id))];
  const { data: restaurants } = await supabase.from("restaurants").select("*").in("id", ids);
  const byId = new Map((restaurants as Restaurant[] | null ?? []).map((r) => [r.id, r]));

  const availability = new Map<string, Promise<Slot[]>>();
  const slotsFor = (e: WaitlistEntry) => {
    const key = `${e.restaurant_id}|${e.date}|${e.party_size}`;
    if (!availability.has(key)) {
      availability.set(key, Promise.resolve(
        supabase
          .rpc("get_availability", { p_restaurant: e.restaurant_id, p_date: e.date, p_party_size: e.party_size })
          .then(({ data }) => (data as Slot[] | null) ?? []),
      ));
    }
    return availability.get(key)!;
  };

  let sent = 0;
  for (const entry of entries as WaitlistEntry[]) {
    const restaurant = byId.get(entry.restaurant_id);
    if (!restaurant) continue;
    const times = (await slotsFor(entry))
      .filter((s) => s.remaining >= entry.party_size)
      .filter((s) => !entry.time || Math.abs(minutes(s.slot) - minutes(entry.time)) <= 60)
      .map((s) => s.slot);
    if (times.length === 0) continue;

    if (await emailWaitlist(entry, times, restaurant, base)) {
      await supabase.from("waitlist").update({ status: "notified", notified_at: new Date().toISOString() }).eq("id", entry.id);
      sent++;
    }
  }
  return sent;
}
