import { requireRestaurant } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import type { MenuCategory, MenuItem } from "@/lib/types";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  move,
  toggleItem,
  updateCategory,
  updateItem,
} from "./actions";

export default async function MenuPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: cats }, { data: items }] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id).order("position").order("created_at"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("position").order("created_at"),
  ]);
  const categories = (cats ?? []) as MenuCategory[];
  const allItems = (items ?? []) as MenuItem[];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carte</h1>
        <p className="text-stone-500">Les modifications apparaissent immédiatement sur votre site.</p>
      </div>

      {categories.map((cat, ci) => {
        const catItems = allItems.filter((i) => i.category_id === cat.id);
        return (
          <section key={cat.id} className={`${cardClass} space-y-3 ${cat.is_visible ? "" : "opacity-70"}`}>
            <div className="flex flex-wrap items-start gap-2">
              <form action={updateCategory.bind(null, cat.id)} className="flex flex-1 flex-wrap items-center gap-2">
                <input name="name" defaultValue={cat.name} className={`${inputClass} max-w-xs text-base font-semibold`} />
                <input name="description" defaultValue={cat.description ?? ""} placeholder="Description (optionnel)" className={`${inputClass} max-w-xs`} />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="is_visible" defaultChecked={cat.is_visible} /> Visible
                </label>
                <SubmitButton variant="secondary">Enregistrer</SubmitButton>
              </form>
              <div className="flex">
                <form action={move.bind(null, "menu_categories", cat.id, -1)}>
                  <SubmitButton variant="ghost" disabled={ci === 0} aria-label="Monter">↑</SubmitButton>
                </form>
                <form action={move.bind(null, "menu_categories", cat.id, 1)}>
                  <SubmitButton variant="ghost" disabled={ci === categories.length - 1} aria-label="Descendre">↓</SubmitButton>
                </form>
                <form action={deleteCategory.bind(null, cat.id)}>
                  <SubmitButton variant="danger" confirm={`Supprimer « ${cat.name} » et ses ${catItems.length} plats ?`}>
                    Supprimer
                  </SubmitButton>
                </form>
              </div>
            </div>

            <ul className="divide-y divide-stone-100 border-t border-stone-100">
              {catItems.map((item, ii) => (
                <li key={item.id} className="py-2">
                  <details>
                    <summary className="flex cursor-pointer list-none items-center gap-3">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-stone-100" />
                      )}
                      <span className={`flex-1 ${item.is_available ? "" : "text-stone-400 line-through"}`}>
                        {item.name}
                      </span>
                      <span className="text-sm font-medium">{formatPrice(item.price, restaurant.currency)}</span>
                      <span className="text-xs text-stone-400">Modifier ▾</span>
                    </summary>
                    <div className="mt-3 rounded-lg bg-stone-50 p-4">
                      <ItemForm
                        action={updateItem.bind(null, item.id)}
                        item={item}
                        categories={categories}
                        submitLabel="Enregistrer"
                      />
                      <div className="mt-3 flex gap-1 border-t border-stone-200 pt-3">
                        <form action={move.bind(null, "menu_items", item.id, -1)}>
                          <SubmitButton variant="ghost" disabled={ii === 0}>↑ Monter</SubmitButton>
                        </form>
                        <form action={move.bind(null, "menu_items", item.id, 1)}>
                          <SubmitButton variant="ghost" disabled={ii === catItems.length - 1}>↓ Descendre</SubmitButton>
                        </form>
                        <form action={deleteItem.bind(null, item.id)} className="ml-auto">
                          <SubmitButton variant="danger" confirm={`Supprimer « ${item.name} » ?`}>Supprimer</SubmitButton>
                        </form>
                      </div>
                    </div>
                  </details>
                  <form action={toggleItem.bind(null, item.id, !item.is_available)} className="mt-1 pl-13">
                    <button className="text-xs text-stone-500 underline hover:text-stone-800">
                      {item.is_available ? "Marquer épuisé" : "Remettre en vente"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <details>
              <summary className="cursor-pointer text-sm font-medium text-stone-700">+ Ajouter un plat</summary>
              <div className="mt-3 rounded-lg bg-stone-50 p-4">
                <ItemForm action={createItem.bind(null, cat.id)} submitLabel="Ajouter" />
              </div>
            </details>
          </section>
        );
      })}

      <form action={createCategory} className={`${cardClass} flex gap-2`}>
        <input name="name" placeholder="Nouvelle catégorie (ex. Vins, Formules…)" required className={inputClass} />
        <SubmitButton>Ajouter</SubmitButton>
      </form>
    </div>
  );
}

function ItemForm({
  action,
  item,
  categories,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  item?: MenuItem;
  categories?: MenuCategory[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6">
      <label className="sm:col-span-4">
        <span className={labelClass}>Nom</span>
        <input name="name" defaultValue={item?.name} required className={inputClass} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelClass}>Prix</span>
        <input name="price" inputMode="decimal" defaultValue={item?.price ?? ""} placeholder="12.50" className={inputClass} />
      </label>
      <label className="sm:col-span-6">
        <span className={labelClass}>Description</span>
        <textarea name="description" rows={2} defaultValue={item?.description ?? ""} className={inputClass} />
      </label>
      <label className="sm:col-span-3">
        <span className={labelClass}>Labels (séparés par des virgules)</span>
        <input name="tags" defaultValue={item?.tags.join(", ")} placeholder="végétarien, fait maison" className={inputClass} />
      </label>
      <label className="sm:col-span-3">
        <span className={labelClass}>Allergènes</span>
        <input name="allergens" defaultValue={item?.allergens.join(", ")} placeholder="gluten, lait" className={inputClass} />
      </label>
      <label className="sm:col-span-3">
        <span className={labelClass}>Photo</span>
        <input type="file" name="image" accept="image/*" className="text-sm" />
      </label>
      <div className="flex flex-col justify-end gap-1 text-sm sm:col-span-3">
        {item?.image_url && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remove_image" /> Retirer la photo actuelle
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_available" defaultChecked={item?.is_available ?? true} /> Disponible
        </label>
      </div>
      {categories && (
        <label className="sm:col-span-3">
          <span className={labelClass}>Catégorie</span>
          <select name="category_id" defaultValue={item?.category_id} className={inputClass}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <div className="flex items-end sm:col-span-6">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
