"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { parseList } from "@/lib/format";

type Supabase = Awaited<ReturnType<typeof requireRestaurantAction>>["supabase"];

function done() {
  revalidatePath("/admin/menu");
  revalidatePath("/widget/menu");
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;

// ── Catégories ─────────────────────────────────────────────

export async function createCategory(formData: FormData) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const name = text(formData, "name");
  if (!name) throw new Error("Nom requis.");
  const { count } = await supabase
    .from("menu_categories")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id);
  check((await supabase.from("menu_categories").insert({ restaurant_id: restaurant.id, name, position: count ?? 0 })).error);
  done();
}

export async function updateCategory(id: string, formData: FormData) {
  const { supabase } = await requireRestaurantAction();
  check(
    (
      await supabase
        .from("menu_categories")
        .update({
          name: text(formData, "name") ?? "Sans nom",
          description: text(formData, "description"),
          is_visible: formData.get("is_visible") === "on",
        })
        .eq("id", id)
    ).error,
  );
  done();
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireRestaurantAction();
  check((await supabase.from("menu_categories").delete().eq("id", id)).error);
  done();
}

// ── Plats ──────────────────────────────────────────────────

async function uploadImage(supabase: Supabase, restaurantId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image.");
  if (file.size > 4 * 1024 * 1024) throw new Error("Image trop lourde (4 Mo max).");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  // Un dossier par restaurant (vérifié par les règles du stockage).
  const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;
  check((await supabase.storage.from("menu").upload(path, file, { contentType: file.type })).error);
  return supabase.storage.from("menu").getPublicUrl(path).data.publicUrl;
}

async function itemFields(supabase: Supabase, restaurantId: string, formData: FormData) {
  const price = text(formData, "price");
  const fields: Record<string, unknown> = {
    name: text(formData, "name") ?? "Sans nom",
    description: text(formData, "description"),
    price: price === null ? null : Number(price.replace(",", ".")),
    tags: parseList(formData.get("tags")),
    allergens: parseList(formData.get("allergens")),
    is_available: formData.get("is_available") === "on",
  };
  if (fields.price !== null && Number.isNaN(fields.price)) throw new Error("Prix invalide.");

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) fields.image_url = await uploadImage(supabase, restaurantId, file);
  else if (formData.get("remove_image") === "on") fields.image_url = null;
  return fields;
}

export async function createItem(categoryId: string, formData: FormData) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const { count } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);
  const fields = await itemFields(supabase, restaurant.id, formData);
  check(
    (await supabase.from("menu_items").insert({ ...fields, restaurant_id: restaurant.id, category_id: categoryId, position: count ?? 0 }))
      .error,
  );
  done();
}

export async function updateItem(id: string, formData: FormData) {
  const { supabase, restaurant } = await requireRestaurantAction();
  const fields = await itemFields(supabase, restaurant.id, formData);
  const categoryId = text(formData, "category_id");
  if (categoryId) fields.category_id = categoryId;
  check((await supabase.from("menu_items").update(fields).eq("id", id)).error);
  done();
}

export async function toggleItem(id: string, available: boolean) {
  const { supabase } = await requireRestaurantAction();
  check((await supabase.from("menu_items").update({ is_available: available }).eq("id", id)).error);
  done();
}

export async function deleteItem(id: string) {
  const { supabase } = await requireRestaurantAction();
  check((await supabase.from("menu_items").delete().eq("id", id)).error);
  done();
}

// ── Ordre d'affichage ─────────────────────────────────────

export async function move(table: "menu_categories" | "menu_items", id: string, direction: -1 | 1) {
  if (table !== "menu_categories" && table !== "menu_items") throw new Error("Table invalide.");
  const { supabase, restaurant } = await requireRestaurantAction();

  let query = supabase.from(table).select("id, position").eq("restaurant_id", restaurant.id).order("position").order("created_at");
  if (table === "menu_items") {
    const { data: item } = await supabase.from("menu_items").select("category_id").eq("id", id).single();
    if (!item) return;
    query = query.eq("category_id", item.category_id);
  }
  const { data: rows } = await query;
  if (!rows) return;

  const ids = rows.map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];

  await Promise.all(ids.map((rowId, position) => supabase.from(table).update({ position }).eq("id", rowId)));
  done();
}
