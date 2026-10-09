import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { closureLabel, formatDate, todayIn } from "@/lib/format";
import { countryFromTimezone, upcomingHolidays, type Country } from "@/lib/holidays";
import { cardClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import type { Closure } from "@/lib/types";
import { closeHoliday, removeClosure } from "./actions";
import { ClosureForm } from "./closure-form";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);
  const country: Country = params.pays === "BE" || params.pays === "FR" ? params.pays : countryFromTimezone(restaurant.timezone);

  const [{ count }, { data }] = await Promise.all([
    supabase.from("dining_tables").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
    supabase.from("closures").select("*").eq("restaurant_id", restaurant.id).gte("date", today).order("date").order("start_time", { nullsFirst: true }),
  ]);
  const closures = (data ?? []) as Closure[];
  const closedDays = new Set(closures.filter((c) => !c.start_time && !c.end_time).map((c) => c.date));
  const holidays = upcomingHolidays(today, country);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <SettingsForm restaurant={restaurant} tableCount={count ?? 0} />

      <section id="fermetures" className={`${cardClass} space-y-4`}>
        <div>
          <h2 className="font-semibold">Fermetures exceptionnelles</h2>
          <p className="text-sm text-stone-500">
            Congés, jours fériés, privatisation, fermeture à partir d&apos;une heure précise… Aucune réservation en ligne
            n&apos;est proposée pendant ces fermetures.
          </p>
        </div>

        <ClosureForm today={today} />

        {closures.length > 0 && (
          <ul className="divide-y divide-stone-100 border-t border-stone-100">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium first-letter:uppercase">{formatDate(c.date)}</span>
                  <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs">{closureLabel(c, restaurant.dinner_from)}</span>
                  {c.reason && <span className="text-stone-500"> — {c.reason}</span>}
                </span>
                <form action={removeClosure.bind(null, c.id)}>
                  <SubmitButton variant="danger">Retirer</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${cardClass} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Jours fériés à venir</h2>
            <p className="text-sm text-stone-500">Fermez un jour férié en un clic (journée entière).</p>
          </div>
          <div className="flex gap-1 text-sm">
            {(["BE", "FR"] as const).map((c) => (
              <Link
                key={c}
                href={`?pays=${c}#feries`}
                scroll={false}
                className={`rounded-lg px-3 py-1.5 ${c === country ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
              >
                {c === "BE" ? "Belgique" : "France"}
              </Link>
            ))}
          </div>
        </div>
        <ul id="feries" className="divide-y divide-stone-100">
          {holidays.map((h) => (
            <li key={h.date} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium first-letter:uppercase">{formatDate(h.date)}</span>
                <span className="text-stone-500"> — {h.name}</span>
              </span>
              {closedDays.has(h.date) ? (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Fermé</span>
              ) : (
                <form action={closeHoliday.bind(null, h.date, h.name)}>
                  <SubmitButton variant="secondary">Fermer ce jour</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
