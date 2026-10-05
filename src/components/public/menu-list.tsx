import { formatPrice } from "@/lib/format";
import type { MenuCategory, MenuItem } from "@/lib/types";

type Category = MenuCategory & { items: MenuItem[] };

/** Carte du restaurant (widget et page publique). */
export function MenuList({ menu, currency, stickyNav = true }: { menu: Category[]; currency: string; stickyNav?: boolean }) {
  const categories = menu
    .map((c) => ({ ...c, items: c.items.filter((i) => i.is_available) }))
    .filter((c) => c.items.length > 0);

  if (categories.length === 0) return <p className="text-stone-500">La carte arrive bientôt.</p>;

  return (
    <>
      {categories.length > 1 && (
        <nav
          className={`${stickyNav ? "sticky top-0 z-10" : ""} -mx-4 mb-4 flex gap-2 overflow-x-auto bg-inherit px-4 py-2 sm:-mx-6 sm:px-6`}
        >
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              className="shrink-0 rounded-full border border-stone-200 px-3 py-1 text-sm hover:border-[var(--brand)] hover:text-[var(--brand)] dark:border-stone-700"
            >
              {c.name}
            </a>
          ))}
        </nav>
      )}

      <div className="space-y-8">
        {categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-14">
            <h2 className="mb-1 border-b-2 border-[var(--brand)] pb-1 text-lg font-semibold">{c.name}</h2>
            {c.description && <p className="mb-2 text-sm text-stone-500">{c.description}</p>}
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {c.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-medium">{item.name}</h3>
                      <span className="shrink-0 font-semibold text-[var(--brand)]">{formatPrice(item.price, currency)}</span>
                    </div>
                    {item.description && <p className="text-sm text-stone-600 dark:text-stone-300">{item.description}</p>}
                    {(item.tags.length > 0 || item.allergens.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1 text-xs">
                        {item.tags.map((t) => (
                          <span key={t} className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {t}
                          </span>
                        ))}
                        {item.allergens.length > 0 && (
                          <span className="text-stone-500">Allergènes : {item.allergens.join(", ")}</span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
