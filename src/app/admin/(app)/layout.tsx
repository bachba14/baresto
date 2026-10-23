import type { Metadata } from "next";
import Link from "next/link";
import { deletionDate, requireRestaurant } from "@/lib/data";
import { LiveUpdates } from "./live-updates";
import { Sidebar } from "./sidebar";
import { ScrollReset } from "./scroll-reset";
import { NewReservationPanel } from "./new-reservation";
import { Toaster } from "@/components/toaster";
import { Tour } from "./tour";
import { RoleProvider } from "./role";
import { NotificationsPanel } from "./notifications";
import { todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

/** Initiales du restaurant : « Le Relais » → « LR ». */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { email, tourDone, restaurant, isAdmin } = await requireRestaurant();
  const deletesOn = deletionDate(restaurant);

  return (
    <RoleProvider isAdmin={isAdmin}>
    <div className="min-h-screen bg-[#faf9f7] md:flex">
      <Sidebar
        restaurant={{ name: restaurant.name, slug: restaurant.slug, color: restaurant.primary_color, initials: initials(restaurant.name) }}
        email={email}
      />

      {/* Connexion temps réel : une seule pour toute la page. */}
      <LiveUpdates restaurantId={restaurant.id} />
      <ScrollReset />
      <NewReservationPanel today={todayIn(restaurant.timezone)} />
      <Toaster />
      <Tour autoStart={!tourDone} />
      <NotificationsPanel />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        {deletesOn && (
          <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
            Suppression du restaurant prévue le{" "}
            <strong>{deletesOn.toLocaleDateString("fr-FR", { timeZone: restaurant.timezone, day: "numeric", month: "long" })}</strong> : page
            publique et réservations en ligne coupées.{" "}
            {isAdmin ? (
              <Link href="/admin/settings#suppression" className="font-medium underline">Annuler la suppression</Link>
            ) : (
              "Seul un administrateur peut l'annuler."
            )}
          </p>
        )}
        {children}
      </main>
    </div>
    </RoleProvider>
  );
}
