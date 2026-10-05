import type { Metadata } from "next";
import { getRestaurantOr404 } from "@/lib/data";
import { addDays, todayIn } from "@/lib/format";
import { ReservationForm } from "@/components/public/reservation-form";
import { WidgetShell, type WidgetParams } from "../../widget-shell";

export const metadata: Metadata = { title: "Réservation", robots: { index: false } };

export default async function ReservationWidget({ params, searchParams }: PageProps<"/widget/[slug]/reservation">) {
  const [{ slug }, query] = await Promise.all([params, searchParams as Promise<WidgetParams>]);
  const restaurant = await getRestaurantOr404(slug);
  const today = todayIn(restaurant.timezone);

  return (
    <WidgetShell restaurant={restaurant} params={query}>
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Réserver une table</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">{restaurant.name}</p>
      </header>
      <ReservationForm
        apiBase={`/api/r/${restaurant.slug}`}
        minDate={today}
        maxDate={addDays(today, restaurant.booking_days_ahead)}
        maxPartySize={restaurant.max_party_size}
        autoConfirm={restaurant.auto_confirm}
        message={restaurant.reservation_message}
        phone={restaurant.phone}
        frameId={query.frame ?? ""}
      />
    </WidgetShell>
  );
}
