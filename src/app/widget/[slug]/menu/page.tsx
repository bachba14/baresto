import type { Metadata } from "next";
import { getPublicMenu, getRestaurantOr404 } from "@/lib/data";
import { MenuList } from "@/components/public/menu-list";
import { WidgetShell, type WidgetParams } from "../../widget-shell";

export const metadata: Metadata = { title: "Carte", robots: { index: false } };

export default async function MenuWidget({ params, searchParams }: PageProps<"/widget/[slug]/menu">) {
  const [{ slug }, query] = await Promise.all([params, searchParams as Promise<WidgetParams>]);
  const restaurant = await getRestaurantOr404(slug);
  const menu = await getPublicMenu(restaurant.id);

  return (
    <WidgetShell restaurant={restaurant} params={query}>
      <header className="mb-4">
        <h1 className="text-xl font-semibold">{restaurant.name}</h1>
        {restaurant.tagline && <p className="text-sm text-stone-500 dark:text-stone-400">{restaurant.tagline}</p>}
      </header>
      <MenuList menu={menu} currency={restaurant.currency} />
    </WidgetShell>
  );
}
