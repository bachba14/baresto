import Link from "next/link";
import { CUSTOMER_BRIEF, CustomerBadges, type CustomerBrief } from "@/components/customer-badges";
import { formatDate, formatTime, STATUS_LABELS } from "@/lib/format";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { RowActions } from "./reservation-editor";

const BADGE: Record<ReservationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  seated: "bg-sky-100 text-sky-800",
  finished: "bg-stone-100 text-stone-600",
  cancelled: "bg-stone-200 text-stone-600 line-through",
  no_show: "bg-red-100 text-red-700",
};

export type ReservationWithTables = Reservation & {
  reservation_tables?: { dining_tables: { label: string } | null }[];
  customers?: CustomerBrief | null;
};

// Sélection Supabase qui inclut le nom des tables affectées.
export const RESERVATION_SELECT = `*, reservation_tables(dining_tables(label)), ${CUSTOMER_BRIEF}`;

export function ReservationRow({ r, showDate = false }: { r: ReservationWithTables; showDate?: boolean }) {
  const tables = (r.reservation_tables ?? []).map((t) => t.dining_tables?.label).filter(Boolean);
  const active = r.status !== "cancelled" && r.status !== "no_show";
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="w-24 shrink-0">
        <p className="text-lg font-semibold">{formatTime(r.time)}</p>
        {showDate && <p className="text-xs text-stone-500">{formatDate(r.date)}</p>}
      </div>
      <div className="min-w-0 flex-1">
        {/* Nom, couverts et statut restent chacun d'un bloc (pas de coupure au milieu de « 7 pers. »). */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
          {r.customers ? (
            <Link href={`/admin/clients/${r.customers.id}`} className="[overflow-wrap:anywhere] hover:underline">{r.name}</Link>
          ) : (
            <span className="[overflow-wrap:anywhere]">{r.name}</span>
          )}
          <span className="whitespace-nowrap text-stone-600">· {r.party_size} pers.</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE[r.status]}`}>
            {STATUS_LABELS[r.status]}
          </span>
          <CustomerBadges customer={r.customers} />
        </p>
        <p
          className="truncate text-sm text-stone-500"
          title={[r.phone, r.email, r.source === "admin" ? "saisie manuelle" : null].filter(Boolean).join(" · ")}
        >
          {[r.phone, r.email].filter(Boolean).join(" · ")}
          {r.source === "admin" && " · saisie manuelle"}
        </p>
        {active && (
          <p className="text-xs">
            {tables.length ? (
              <span className="text-stone-600">Table {tables.join(" + ")}</span>
            ) : (
              <span className="rounded bg-amber-100 px-1.5 font-medium text-amber-800">Sans table</span>
            )}
          </p>
        )}
        {r.notes && <p className="mt-1 text-sm text-stone-700 italic">« {r.notes} »</p>}
        {r.customers?.notes && <p className="mt-1 text-sm text-violet-800">📝 {r.customers.notes}</p>}
      </div>
      <RowActions r={r} />
    </li>
  );
}
