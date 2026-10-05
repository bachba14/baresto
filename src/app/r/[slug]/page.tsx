import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPublicMenu, getRestaurantOr404 } from "@/lib/data";
import { addDays, DAY_ORDER, DAYS, formatTime, todayIn } from "@/lib/format";
import { MenuList } from "@/components/public/menu-list";
import { ReservationForm } from "@/components/public/reservation-form";
import { Logo } from "@/components/logo";

export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const restaurant = await getRestaurantOr404((await params).slug);
  return {
    title: { absolute: `${restaurant.name} — Réserver une table` },
    description: [restaurant.tagline, restaurant.cuisine, restaurant.city].filter(Boolean).join(" · "),
  };
}

export default async function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  const restaurant = await getRestaurantOr404((await params).slug);
  const menu = await getPublicMenu(restaurant.id);
  const today = todayIn(restaurant.timezone);
  const subtitle = [restaurant.cuisine, restaurant.city].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-stone-50" style={{ "--brand": restaurant.primary_color } as CSSProperties}>
      <header className="relative overflow-hidden bg-stone-900 text-white">
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: `radial-gradient(circle at 20% 0%, ${restaurant.primary_color}, transparent 60%)` }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
          {subtitle && <p className="text-sm font-medium tracking-wider text-white/70 uppercase">{subtitle}</p>}
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{restaurant.name}</h1>
          {restaurant.tagline && <p className="mt-3 text-lg text-white/80">{restaurant.tagline}</p>}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            {restaurant.address && <span>📍 {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ""}</span>}
            {restaurant.phone && <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`} className="hover:text-white">📞 {restaurant.phone}</a>}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_400px]">
        <section className="order-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:order-1">
          <h2 className="mb-4 text-2xl font-bold">La carte</h2>
          <MenuList menu={menu} currency={restaurant.currency} />
        </section>

        <aside className="order-1 space-y-6 lg:order-2">
          <div id="reserver" className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 className="mb-4 text-xl font-bold">Réserver une table</h2>
            <ReservationForm
              apiBase={`/api/r/${restaurant.slug}`}
              minDate={today}
              maxDate={addDays(today, restaurant.booking_days_ahead)}
              maxPartySize={restaurant.max_party_size}
              autoConfirm={restaurant.auto_confirm}
              message={restaurant.reservation_message}
              phone={restaurant.phone}
              frameId=""
            />
          </div>

          <div className="rounded-2xl bg-white p-4 text-sm shadow-sm sm:p-6">
            <h2 className="mb-2 font-bold">Horaires de réservation</h2>
            <ul className="space-y-1">
              {DAY_ORDER.map((d) => {
                const ranges = restaurant.opening_hours[d] ?? [];
                return (
                  <li key={d} className="flex justify-between gap-4">
                    <span className="text-stone-500">{DAYS[d]}</span>
                    <span>{ranges.length ? ranges.map((r) => `${formatTime(r.start)}–${formatTime(r.end)}`).join(" · ") : "Fermé"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </main>

      <footer className="py-8 text-center text-xs text-stone-400">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-stone-600">
          Réservations propulsées par <span className="scale-75"><Logo /></span>
        </Link>
      </footer>
    </div>
  );
}
