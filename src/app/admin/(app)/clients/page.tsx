import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cardClass, inputClass } from "@/components/admin-styles";
import { CustomerBadges } from "@/components/customer-badges";
import type { Customer } from "@/lib/types";

const SORTS = {
  recent: { label: "Dernière visite", column: "last_date" },
  loyal: { label: "Plus fidèles", column: "reservation_count" },
  noshow: { label: "No-shows", column: "no_show_count" },
} as const;

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clients">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const sort = (typeof params.sort === "string" && params.sort in SORTS ? params.sort : "recent") as keyof typeof SORTS;
  // Caractères réservés de la syntaxe de filtre PostgREST retirés.
  const q = typeof params.q === "string" ? params.q.replace(/[,()*%\\]/g, " ").trim().slice(0, 60) : "";

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("restaurant_id", restaurant.id)
    .order(SORTS[sort].column, { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (sort === "noshow") query = query.gt("no_show_count", 0);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, count } = await query;
  const customers = (data ?? []) as Customer[];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-stone-500">
          Une fiche est créée automatiquement à chaque réservation (même e-mail ou même téléphone = même client).
        </p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Nom, e-mail ou téléphone" className={`${inputClass} w-auto flex-1`} />
        <input type="hidden" name="sort" value={sort} />
        <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Rechercher</button>
      </form>

      <div className="flex flex-wrap gap-1">
        {Object.entries(SORTS).map(([key, s]) => (
          <Link
            key={key}
            href={`?sort=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${key === sort ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
          >
            {s.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-sm text-stone-500">{count ?? 0} client{(count ?? 0) > 1 ? "s" : ""}</span>
      </div>

      <div className={cardClass}>
        {customers.length === 0 ? (
          <p className="text-stone-500">{q ? "Aucun client trouvé." : "Les clients apparaîtront ici après leurs premières réservations."}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/clients/${c.id}`} className="flex flex-col gap-1 py-3 hover:bg-stone-50 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {c.name} <CustomerBadges customer={c} />
                    </p>
                    <p className="truncate text-sm text-stone-500">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                    {c.notes && <p className="truncate text-sm text-violet-800">📝 {c.notes}</p>}
                  </div>
                  <p className="shrink-0 text-sm text-stone-500 first-letter:uppercase">
                    {c.last_date ? `Dernière résa : ${formatDate(c.last_date)}` : "Aucune réservation active"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
