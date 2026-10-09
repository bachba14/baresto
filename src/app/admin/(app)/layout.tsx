import type { Metadata } from "next";
import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { Logo } from "@/components/logo";
import { logout } from "@/app/(auth)/actions";
import { AdminNav, Icon } from "./admin-nav";
import { LiveIndicator, LiveUpdates } from "./live-updates";

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
  const { email, restaurant } = await requireRestaurant();

  return (
    <div className="min-h-screen bg-[#faf9f7] md:flex">
      {/* La barre latérale se fond dans le fond de page : pas de bordure ni de bloc blanc. */}
      <aside className="sticky top-0 z-30 bg-[#faf9f7]/85 backdrop-blur md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:bg-transparent md:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 md:block md:px-6 md:pt-7 md:pb-6">
          <Link href="/admin" aria-label="Tableau de bord"><Logo /></Link>

          {/* Mobile : direct + déconnexion */}
          <div className="flex items-center gap-3 md:hidden">
            <LiveIndicator />
            <form action={logout}>
              <button aria-label="Se déconnecter" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900/5 hover:text-stone-900">
                <Icon name="logout" />
              </button>
            </form>
          </div>

          {/* Bureau : carte du restaurant */}
          <div className="mt-6 hidden items-center gap-3 md:flex">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white"
              style={{ background: restaurant.primary_color }}
              aria-hidden
            >
              {initials(restaurant.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-stone-900">{restaurant.name}</span>
              <LiveIndicator />
            </span>
          </div>
        </div>

        <AdminNav />

        <div className="mt-auto hidden space-y-1 px-3 pt-6 pb-5 md:block">
          <a
            href={`/r/${restaurant.slug}`}
            target="_blank"
            className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-900/[0.04] hover:text-stone-900"
          >
            <span className="text-stone-400 group-hover:text-stone-600"><Icon name="external" /></span>
            Ma page publique
          </a>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600" aria-hidden>
              {email?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{email}</span>
            <form action={logout}>
              <button
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-900/5 hover:text-stone-900"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Connexion temps réel : une seule pour toute la page. */}
      <LiveUpdates restaurantId={restaurant.id} />

      <main className="min-w-0 flex-1 p-4 md:py-8 md:pr-8 md:pl-2">{children}</main>
    </div>
  );
}
