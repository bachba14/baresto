import type { Customer } from "@/lib/types";

export type CustomerBrief = Pick<Customer, "id" | "reservation_count" | "no_show_count" | "notes" | "tags">;

/** Sélection Supabase de la fiche client résumée, à embarquer dans une requête de réservations. */
export const CUSTOMER_BRIEF = "customers(id, reservation_count, no_show_count, notes, tags)";

/** Repères rapides sur le client : fidélité, no-shows, étiquettes (VIP, allergie…). */
export function CustomerBadges({ customer, compact = false }: { customer: CustomerBrief | null | undefined; compact?: boolean }) {
  if (!customer) return null;
  const n = customer.reservation_count;
  const pill = "rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none";
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {customer.tags.map((t) => (
        <span key={t} className={`${pill} ${t.toLowerCase() === "vip" ? "bg-amber-200 text-amber-900" : "bg-violet-100 text-violet-800"}`}>
          {t}
        </span>
      ))}
      {n <= 1 ? (
        !compact && <span className={`${pill} bg-sky-100 text-sky-800`}>1re visite</span>
      ) : (
        <span className={`${pill} bg-emerald-100 text-emerald-800`}>{n >= 3 ? "Habitué · " : ""}{n} résa</span>
      )}
      {customer.no_show_count > 0 && (
        <span className={`${pill} bg-red-100 text-red-700`}>⚠ {customer.no_show_count} no-show</span>
      )}
    </span>
  );
}
