import type { Metadata } from "next";
import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { Logo } from "@/components/logo";
import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { email, restaurant } = await requireRestaurant();

  return (
    <div className="min-h-screen bg-stone-50 md:flex">
      <aside className="border-b border-stone-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/admin"><Logo /></Link>
          <p className="mt-1 hidden truncate text-sm font-medium text-stone-600 md:block">{restaurant.name}</p>
          <form action={logout} className="md:hidden">
            <button className="text-sm text-stone-600 hover:text-stone-900">Déconnexion</button>
          </form>
        </div>
        <AdminNav />
        <div className="mt-auto hidden space-y-2 p-4 md:block">
          <a
            href={`/r/${restaurant.slug}`}
            target="_blank"
            className="block rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Ma page publique ↗
          </a>
          <p className="truncate text-xs text-stone-500">{email}</p>
          <form action={logout}>
            <button className="text-sm text-stone-600 hover:text-stone-900">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
