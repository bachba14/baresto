import { requireRestaurant } from "@/lib/data";
import { formatDate, todayIn } from "@/lib/format";
import { cardClass, inputClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { addClosure, removeClosure } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { count } = await supabase.from("dining_tables").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id);
  const { data: closures } = await supabase
    .from("closures")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .gte("date", todayIn(restaurant.timezone))
    .order("date");

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <SettingsForm restaurant={restaurant} tableCount={count ?? 0} />

      <section className={cardClass}>
        <h2 className="font-semibold">Fermetures exceptionnelles</h2>
        <p className="mb-3 text-sm text-stone-500">Congés, privatisations… aucune réservation en ligne ces jours-là.</p>
        <ul className="mb-3 divide-y divide-stone-100">
          {(closures ?? []).map((c) => (
            <li key={c.date} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="first-letter:uppercase">{formatDate(c.date)}</span>
                {c.reason && <span className="text-stone-500"> — {c.reason}</span>}
              </span>
              <form action={removeClosure.bind(null, c.date)}>
                <SubmitButton variant="danger">Retirer</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={addClosure} className="flex flex-wrap gap-2">
          <input type="date" name="date" required className={`${inputClass} w-auto`} />
          <input name="reason" placeholder="Motif (optionnel)" className={`${inputClass} w-auto flex-1`} />
          <SubmitButton variant="secondary">Ajouter</SubmitButton>
        </form>
      </section>
    </div>
  );
}
