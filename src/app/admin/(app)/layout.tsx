import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireRestaurant } from "@/lib/data";
import { LiveUpdates } from "./live-updates";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";
import { Sidebar } from "./sidebar";

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
  const [{ email, restaurant }, cookieStore] = await Promise.all([requireRestaurant(), cookies()]);

  return (
    <div className="min-h-screen bg-[#faf9f7] md:flex">
      <Sidebar
        restaurant={{ name: restaurant.name, slug: restaurant.slug, color: restaurant.primary_color, initials: initials(restaurant.name) }}
        email={email}
        initialPinned={cookieStore.get(SIDEBAR_COOKIE)?.value === "pinned"}
      />

      {/* Connexion temps réel : une seule pour toute la page. */}
      <LiveUpdates restaurantId={restaurant.id} />

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
