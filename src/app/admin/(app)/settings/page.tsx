import { cookies } from "next/headers";
import { deletionDate, requireAdmin } from "@/lib/data";
import { closureLabel, formatDate, todayIn } from "@/lib/format";
import { countryOf, HOLIDAY_COUNTRY_COOKIE, upcomingHolidays, type Country } from "@/lib/holidays";
import { cardClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import type { Closure } from "@/lib/types";
import { cancelDeletion, closeHoliday, removeClosure, setHolidayCountry } from "./actions";
import { ClosureForm } from "./closure-form";
import { DeleteRestaurant } from "./delete-restaurant";
import { SectionNav } from "./section-nav";
import { SettingsForm } from "./settings-form";

const SECTIONS = [
  ["etablissement", "Établissement"],
  ["reservations-en-ligne", "Réservations en ligne"],
  ["e-mails", "E-mails"],
  ["horaires", "Horaires"],
  ["fermetures", "Fermetures"],
  ["jours-feries", "Jours fériés"],
  ["donnees", "Vos données"],
] as const;

export default async function SettingsPage() {
  const [{ supabase, restaurant }, cookieStore] = await Promise.all([requireAdmin(), cookies()]);
  const today = todayIn(restaurant.timezone);
  // Pays des jours fériés : celui choisi (mémorisé), sinon déduit de l'adresse et du téléphone du restaurant.
  const saved = cookieStore.get(HOLIDAY_COUNTRY_COOKIE)?.value;
  const country: Country = saved === "BE" || saved === "FR" ? saved : countryOf(restaurant);

  const [{ count }, { data }, { count: upcoming }] = await Promise.all([
    supabase.from("dining_tables").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
    supabase.from("closures").select("*").eq("restaurant_id", restaurant.id).gte("date", today).order("date").order("start_time", { nullsFirst: true }),
    supabase.from("reservations").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).gte("date", today)
      .in("status", ["pending", "confirmed"]),
  ]);
  const deletesOn = deletionDate(restaurant);
  const closures = (data ?? []) as Closure[];
  const closedDays = new Set(closures.filter((c) => !c.start_time && !c.end_time).map((c) => c.date));
  const holidays = upcomingHolidays(today, country);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Réglages</h1>
      {/* Navigation entre les sections de la page */}
      <SectionNav sections={SECTIONS} />
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

      <section id="donnees" className={`${cardClass} scroll-mt-20 space-y-5`}>
        <div>
          <h2 className="font-semibold">Vos données</h2>
          <p className="text-sm text-stone-500">Elles vous appartiennent : récupérez-les quand vous voulez.</p>
        </div>

        <div>
          <a href="/admin/export-donnees" className="inline-block rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-stone-50">
            ⬇ Exporter toutes mes données (Excel)
          </a>
          <p className="mt-1 text-xs text-stone-500">Réservations, clients, liste d&apos;attente, carte, plan de salle, fermetures et équipe.</p>
        </div>

        <div id="suppression" className="scroll-mt-20 space-y-2 border-t border-stone-100 pt-5">
          <h3 className="font-medium text-red-700">Supprimer mon restaurant</h3>
          {deletesOn ? (
            <div className="space-y-3 rounded-xl bg-red-50 p-4 text-sm text-red-900 ring-1 ring-red-200">
              <p>
                Suppression définitive prévue le{" "}
                <strong>{deletesOn.toLocaleDateString("fr-FR", { timeZone: restaurant.timezone, day: "numeric", month: "long", year: "numeric" })}</strong>.
                Votre page publique et les réservations en ligne sont coupées.
              </p>
              <form action={cancelDeletion}>
                <SubmitButton>Annuler la suppression</SubmitButton>
              </form>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-500">
                Pensez à exporter vos données avant. Vous aurez 30 jours pour changer d&apos;avis.
              </p>
              <DeleteRestaurant name={restaurant.name} upcoming={upcoming ?? 0} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
