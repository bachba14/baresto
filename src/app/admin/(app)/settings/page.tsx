import { cookies } from "next/headers";
import { requireRestaurant } from "@/lib/data";
import { closureLabel, formatDate, todayIn } from "@/lib/format";
import { countryOf, HOLIDAY_COUNTRY_COOKIE, upcomingHolidays, type Country } from "@/lib/holidays";
import { cardClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import type { Closure } from "@/lib/types";
import { closeHoliday, removeClosure, setHolidayCountry } from "./actions";
import { ClosureForm } from "./closure-form";
import { SettingsForm } from "./settings-form";

const SECTIONS = [
  ["etablissement", "Établissement"],
  ["reservations-en-ligne", "Réservations en ligne"],
  ["e-mails", "E-mails"],
  ["horaires", "Horaires"],
  ["fermetures", "Fermetures"],
  ["jours-feries", "Jours fériés"],
] as const;

export default async function SettingsPage() {
  const [{ supabase, restaurant }, cookieStore] = await Promise.all([requireRestaurant(), cookies()]);
  const today = todayIn(restaurant.timezone);
  // Pays des jours fériés : celui choisi (mémorisé), sinon déduit de l'adresse et du téléphone du restaurant.
  const saved = cookieStore.get(HOLIDAY_COUNTRY_COOKIE)?.value;
  const country: Country = saved === "BE" || saved === "FR" ? saved : countryOf(restaurant);

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
      {/* Navigation entre les sections de la page */}
      <nav aria-label="Sections des réglages" className="z-20 -mx-4 flex gap-1 overflow-x-auto bg-[#faf9f7]/90 px-4 py-2 backdrop-blur md:sticky md:top-0">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-900/5 hover:text-stone-900">
            {label}
          </a>
        ))}
      </nav>
      <SettingsForm restaurant={restaurant} tableCount={count ?? 0} />

      <section id="fermetures" className={`${cardClass} scroll-mt-20 space-y-4`}>
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

      <section id="jours-feries" className={`${cardClass} scroll-mt-20 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Jours fériés à venir</h2>
            <p className="text-sm text-stone-500">Fermez un jour férié en un clic (journée entière).</p>
          </div>
          <div className="flex gap-1 text-sm">
            {(["BE", "FR"] as const).map((c) => (
              <form key={c} action={setHolidayCountry.bind(null, c)}>
                <button
                  aria-pressed={c === country}
                  className={`rounded-lg px-3 py-1.5 ${c === country ? "bg-stone-900 text-white" : "border border-stone-300 bg-white hover:bg-stone-50"}`}
                >
                  {c === "BE" ? "Belgique" : "France"}
                </button>
              </form>
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
