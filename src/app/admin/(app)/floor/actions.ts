"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { tableSize } from "@/lib/floor";
import type { DiningTable, Room, TableShape } from "@/lib/types";

const SHAPES: TableShape[] = ["round", "square", "rect"];

function done() {
  revalidatePath("/admin", "layout");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanTable(t: Partial<DiningTable>, roomId: string, restaurantId: string) {
  const seats = Math.round(Number(t.seats));
  if (!t.label?.trim()) throw new Error("Chaque table doit avoir un nom.");
  if (!(seats >= 1 && seats <= 30)) throw new Error(`Table ${t.label} : nombre de places invalide.`);
  const minSeats = Math.min(seats, Math.max(1, Math.round(Number(t.min_seats) || 1)));
  return {
    restaurant_id: restaurantId,
    room_id: roomId,
    label: t.label.trim().slice(0, 20),
    seats,
    min_seats: minSeats,
    shape: SHAPES.includes(t.shape as TableShape) ? t.shape : "square",
    x: Number(t.x) || 0,
    y: Number(t.y) || 0,
    rotation: ((Number(t.rotation) || 0) % 360 + 360) % 360,
    combine_group: t.combine_group?.trim() || null,
    bookable_online: t.bookable_online !== false,
  };
}

/** Enregistre une salle et toutes ses tables. Les ids "new-…" sont des tables à créer. */
export async function saveRoom(
  room: Pick<Room, "id" | "name" | "width" | "depth">,
  tables: Partial<DiningTable>[],
): Promise<{ error: string } | { tables: DiningTable[] }> {
  try {
    const { supabase, restaurant } = await requireRestaurantAction();
    const width = Number(room.width);
    const depth = Number(room.depth);
    if (!(width >= 2 && width <= 100 && depth >= 2 && depth <= 100)) throw new Error("Dimensions de salle invalides (2 à 100 m).");

    const labels = tables.map((t) => t.label?.trim().toLowerCase());
    const dup = labels.find((l, i) => labels.indexOf(l) !== i);
    if (dup) throw new Error(`Deux tables portent le même nom : ${dup.toUpperCase()}.`);

    const { error: roomError } = await supabase
      .from("rooms")
      .update({ name: room.name.trim() || "Salle", width, depth })
      .eq("id", room.id);
    if (roomError) throw new Error(roomError.message);

    const existing = tables.filter((t) => t.id && !t.id.startsWith("new-"));
    if (existing.some((t) => !UUID.test(t.id!))) throw new Error("Table invalide.");
    const created = tables.filter((t) => !t.id || t.id.startsWith("new-"));

    // Supprime les tables retirées du plan.
    let del = supabase.from("dining_tables").delete().eq("room_id", room.id);
    if (existing.length) del = del.not("id", "in", `(${existing.map((t) => t.id).join(",")})`);
    const { error: delError } = await del;
    if (delError) throw new Error(delError.message);

    if (existing.length) {
      const { error } = await supabase
        .from("dining_tables")
        .upsert(existing.map((t) => ({ id: t.id, ...cleanTable(t, room.id, restaurant.id) })));
      if (error) throw new Error(error.message);
    }
    if (created.length) {
      const { error } = await supabase.from("dining_tables").insert(created.map((t) => cleanTable(t, room.id, restaurant.id)));
      if (error) throw new Error(error.message);
    }

    const { data, error } = await supabase.from("dining_tables").select("*").eq("room_id", room.id).order("label");
    if (error) throw new Error(error.message);
    done();
    return {
      tables: data.map((t) => ({ ...t, x: Number(t.x), y: Number(t.y), rotation: Number(t.rotation) })) as DiningTable[],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

export async function createRoom(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const name = String(formData.get("name") ?? "").trim() || "Nouvelle salle";
  const { count } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id);
  const { error } = await supabase
    .from("rooms")
    .insert({ restaurant_id: restaurant.id, name, width: 10, depth: 8, position: count ?? 0 });
  if (error) throw new Error(error.message);
  done();
}

export async function deleteRoom(id: string) {
  const { supabase } = await requireRestaurantAction();
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw new Error(error.message);
  done();
}

// ── Configuration rapide ───────────────────────────────────

export type QuickGroup = { count: number; seats: number };

/**
 * Génère une salle à partir d'un simple inventaire (« 6 tables de 2, 4 tables de 4… »).
 * Les tables sont rangées en lignes ; les petites tables voisines sont combinables deux à deux.
 */
export async function quickSetup(
  roomName: string,
  groups: QuickGroup[],
  replaceAll: boolean,
): Promise<string | null> {
  try {
    const { supabase, restaurant } = await requireRestaurantAction();
    const list = groups
      .filter((g) => g.count > 0 && g.seats > 0)
      .flatMap((g) => Array.from({ length: Math.min(100, Math.round(g.count)) }, () => Math.min(30, Math.round(g.seats))))
      .sort((a, b) => a - b);
    if (list.length === 0) throw new Error("Indiquez au moins une table.");
    if (list.length > 150) throw new Error("150 tables maximum.");

    // Préfixe des noms : T1, T2… ou, pour une salle ajoutée, l'initiale de la salle (E1, E2…).
    const prefix = replaceAll ? "T" : (roomName.trim()[0] ?? "S").toUpperCase();
    const shapeFor = (seats: number): TableShape => (seats <= 4 ? "square" : seats <= 6 ? "round" : "rect");
    const cells = list.map((seats) => {
      const shape = shapeFor(seats);
      const { w, d } = tableSize({ shape, seats });
      return { seats, shape, w: w + 1.0, d: d + 1.1 };
    });

    // Largeur visée : salle à peu près au format 3:2.
    const area = cells.reduce((s, c) => s + c.w * c.d, 0);
    const targetWidth = Math.max(6, Math.sqrt(area * 1.5));

    const placed: ReturnType<typeof cleanTable>[] = [];
    let x = 0.4;
    let y = 0.4;
    let rowDepth = 0;
    let row = 0;
    let indexInRow = 0;
    let maxX = 0;
    cells.forEach((c, i) => {
      if (x + c.w > targetWidth + 0.4 && indexInRow > 0) {
        x = 0.4;
        y += rowDepth;
        rowDepth = 0;
        row++;
        indexInRow = 0;
      }
      const combinable = c.seats <= 4;
      placed.push(
        cleanTable(
          {
            label: `${prefix}${i + 1}`,
            seats: c.seats,
            min_seats: c.seats <= 2 ? 1 : Math.ceil(c.seats / 2),
            shape: c.shape,
            x: Math.round((x + c.w / 2) * 10) / 10,
            y: Math.round((y + c.d / 2) * 10) / 10,
            rotation: 0,
            combine_group: combinable ? `R${row + 1}-${Math.floor(indexInRow / 2) + 1}` : null,
            bookable_online: true,
          },
          "",
          restaurant.id,
        ),
      );
      x += c.w;
      maxX = Math.max(maxX, x);
      rowDepth = Math.max(rowDepth, c.d);
      indexInRow++;
    });

    const width = Math.ceil((maxX + 0.4) * 2) / 2;
    const depth = Math.ceil((y + rowDepth + 0.4) * 2) / 2;

    if (replaceAll) {
      const { error } = await supabase.from("rooms").delete().eq("restaurant_id", restaurant.id);
      if (error) throw new Error(error.message);
    }
    const { count } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id);
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ restaurant_id: restaurant.id, name: roomName.trim() || "Salle", width, depth, position: count ?? 0 })
      .select("id")
      .single();
    if (roomError) throw new Error(roomError.message);

    const { error } = await supabase.from("dining_tables").insert(placed.map((t) => ({ ...t, room_id: room.id })));
    if (error) throw new Error(error.message);
    done();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Erreur inconnue.";
  }
}
