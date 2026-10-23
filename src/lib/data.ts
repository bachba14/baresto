import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient, createPublicClient } from "./supabase/server";
import type { DiningTable, MenuCategory, MenuItem, PlacedReservation, Reservation, Restaurant, Room } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// ── Public (widgets, page restaurant, API) ─────────────────

export const getRestaurantBySlug = cache(async (slug: string): Promise<Restaurant | null> => {
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) return null;
  const { data } = await createPublicClient().from("restaurants").select("*").eq("slug", slug).maybeSingle();
  const restaurant = data as Restaurant | null;
  // Suppression demandée : page publique, widgets et API répondent « introuvable ».
  return restaurant?.deletion_requested_at ? null : restaurant;
});

/** Réservations en ligne en pause (même règle que online_paused() en SQL). */
export function isOnlinePaused(restaurant: Pick<Restaurant, "online_paused_at" | "online_resume_at">) {
  if (!restaurant.online_paused_at) return false;
  return !restaurant.online_resume_at || new Date(restaurant.online_resume_at) > new Date();
}

/** « Réservations en ligne en pause jusqu'à… » pour le back-office. */
export function pauseLabel(restaurant: Pick<Restaurant, "online_resume_at" | "timezone">) {
  if (!restaurant.online_resume_at) return "Réservations en ligne en pause jusqu'à ce que vous les rouvriez.";
  const until = new Date(restaurant.online_resume_at).toLocaleString("fr-FR", {
    timeZone: restaurant.timezone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  return `Réservations en ligne en pause, réouverture automatique ${until}.`;
}

export const ONLINE_PAUSED ="Les réservations en ligne sont momentanément fermées. Merci d'appeler le restaurant.";

/** Date de suppression définitive d'un restaurant (30 jours après la demande). */
export function deletionDate(restaurant: Pick<Restaurant, "deletion_requested_at">) {
  if (!restaurant.deletion_requested_at) return null;
  return new Date(new Date(restaurant.deletion_requested_at).getTime() + 30 * 86_400_000);
}

/** Restaurant public par son adresse, ou page 404. */
export async function getRestaurantOr404(slug: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  return restaurant;
}

/** Carte publique : catégories visibles avec leurs plats. */
export async function getPublicMenu(restaurantId: string) {
  const supabase = createPublicClient();
  const [cats, items] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId).eq("is_visible", true).order("position"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).order("position"),
  ]);
  if (cats.error) throw new Error(cats.error.message);
  if (items.error) throw new Error(items.error.message);

  return (cats.data as MenuCategory[]).map((c) => ({
    ...c,
    items: (items.data as MenuItem[]).filter((i) => i.category_id === c.id),
  }));
}

// ── Espace restaurateur ────────────────────────────────────

/** Utilisateur connecté, sinon redirection vers la connexion. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const meta = data.claims.user_metadata as { tour_done?: boolean } | undefined;
  return {
    supabase,
    userId: data.claims.sub as string,
    email: data.claims.email as string | undefined,
    /** Visite guidée du back-office déjà vue. */
    tourDone: meta?.tour_done === true,
  };
});

/** Restaurant de l'utilisateur connecté (ou null s'il n'en a pas encore créé). */
export const getMyRestaurant = cache(async () => {
  const { supabase, userId, email, tourDone } = await requireUser();
  const { data } = await supabase
    .from("restaurant_members")
    .select("role, restaurants(*)")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const restaurant = (data?.restaurants ?? null) as unknown as Restaurant | null;
  /** Administrateur (rôle « owner ») ou employé (« staff »). */
  const isAdmin = data?.role === "owner";
  return { supabase, userId, email, tourDone, restaurant, isAdmin };
});

/**
 * Accès au back-office : connecté, avec un restaurant configuré.
 * Sans restaurant ou configuration inachevée → assistant de démarrage.
 */
export const requireRestaurant = cache(async () => {
  const ctx = await getMyRestaurant();
  if (!ctx.restaurant || !ctx.restaurant.onboarding_completed) redirect("/onboarding");
  return { ...ctx, restaurant: ctx.restaurant };
});

/** Page réservée aux administrateurs : un employé est renvoyé au tableau de bord. */
export async function requireAdmin() {
  const ctx = await requireRestaurant();
  if (!ctx.isAdmin) redirect("/admin");
  return ctx;
}

/** Pour les Server Actions : restaurant de l'utilisateur, sans exiger la fin de l'assistant. */
export async function requireRestaurantAction() {
  const ctx = await getMyRestaurant();
  if (!ctx.restaurant) throw new Error("Aucun restaurant associé à ce compte.");
  return { ...ctx, restaurant: ctx.restaurant };
}

export const ADMIN_ONLY = "Réservé aux administrateurs du restaurant.";

/** Server Action réservée aux administrateurs (les droits sont aussi vérifiés en base). */
export async function requireAdminAction() {
  const ctx = await requireRestaurantAction();
  if (!ctx.isAdmin) throw new Error(ADMIN_ONLY);
  return ctx;
}

/** Salles et tables du restaurant. */
export async function getFloor(supabase: Supabase, restaurantId: string) {
  const [rooms, tables] = await Promise.all([
    supabase.from("rooms").select("*").eq("restaurant_id", restaurantId).order("position").order("created_at"),
    supabase.from("dining_tables").select("*").eq("restaurant_id", restaurantId).order("label"),
  ]);
  if (rooms.error) throw new Error(rooms.error.message);
  if (tables.error) throw new Error(tables.error.message);
  return {
    rooms: (rooms.data as Room[]).map((r) => ({ ...r, width: Number(r.width), depth: Number(r.depth) })),
    tables: tables.data.map((t) => ({ ...t, x: Number(t.x), y: Number(t.y), rotation: Number(t.rotation) })) as DiningTable[],
  };
}

/** Réservations d'un jour avec leurs tables. */
export async function getPlacedReservations(supabase: Supabase, restaurantId: string, date: string): Promise<PlacedReservation[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*, reservation_tables(table_id), customers(id, reservation_count, no_show_count, notes, tags)")
    .eq("restaurant_id", restaurantId)
    .eq("date", date)
    .order("time");
  if (error) throw new Error(error.message);
  return data.map(({ reservation_tables, customers, ...r }) => ({
    ...(r as Reservation),
    table_ids: (reservation_tables as { table_id: string }[]).map((t) => t.table_id),
    customer: (customers ?? null) as PlacedReservation["customer"],
  }));
}

// ── Gestion de sa réservation par le client (lien secret) ──

export type TokenReservation = Pick<
  Reservation,
  "id" | "restaurant_id" | "date" | "time" | "party_size" | "duration_minutes" | "name" | "email" | "phone" | "notes" | "status"
> & { token: string; deadline: string; can_modify: boolean };

/** Réservation et restaurant à partir du lien de gestion, ou null. */
export const getReservationByToken = cache(async (token: string) => {
  if (!/^[a-f0-9]{32,80}$/.test(token)) return null;
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_reservation_by_token", { p_token: token });
  const row = (data as Omit<TokenReservation, "token">[] | null)?.[0];
  if (!row) return null;
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("id", row.restaurant_id).single();
  if (!restaurant) return null;
  return { reservation: { ...row, token } as TokenReservation, restaurant: restaurant as Restaurant };
});
