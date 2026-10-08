import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReservationByToken } from "@/lib/data";
import { addDays, formatDate, formatTime, todayIn } from "@/lib/format";
import { deadlineText } from "@/lib/notifications";
import { ManageForm } from "./manage-form";

export const metadata: Metadata = { title: "Ma réservation", robots: { index: false } };

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente de confirmation", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmée", className: "bg-emerald-100 text-emerald-800" },
  seated: { label: "Installée", className: "bg-sky-100 text-sky-800" },
  cancelled: { label: "Annulée", className: "bg-stone-200 text-stone-600" },
  no_show: { label: "Non honorée", className: "bg-red-100 text-red-700" },
};

export default async function ManageReservationPage({ params }: PageProps<"/reservation/[token]">) {
  const { token } = await params;
  const found = await getReservationByToken(token);
  if (!found) notFound();
  const { reservation: r, restaurant } = found;
  const today = todayIn(restaurant.timezone);
  const status = STATUS[r.status] ?? STATUS.pending;
  const active = r.status === "pending" || r.status === "confirmed";

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10" style={{ "--brand": restaurant.primary_color } as CSSProperties}>
      <main className="mx-auto max-w-lg space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm text-stone-500">Votre réservation chez</p>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        </div>

        <div className="rounded-xl bg-stone-50 p-4">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          <p className="mt-2 text-lg font-semibold first-letter:uppercase">{formatDate(r.date)}</p>
          <p className="text-stone-700">
            {formatTime(r.time)} · {r.party_size} {r.party_size > 1 ? "personnes" : "personne"} · au nom de {r.name}
          </p>
          {r.notes && <p className="mt-1 text-sm text-stone-500 italic">« {r.notes} »</p>}
        </div>

        {r.can_modify ? (
          <>
            <p className="text-sm text-stone-600">
              Vous pouvez modifier ou annuler en ligne jusqu&apos;au {deadlineText(r)}.
            </p>
            <ManageForm
              token={r.token}
              date={r.date}
              time={r.time}
              party={r.party_size}
              minDate={today}
              maxDate={addDays(today, restaurant.booking_days_ahead)}
              maxPartySize={restaurant.max_party_size}
            />
          </>
        ) : active ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            La modification en ligne n&apos;est plus possible à moins de 24 h du repas.
            {restaurant.phone ? <> Pour tout changement, appelez le restaurant au <a className="font-medium underline" href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>{restaurant.phone}</a>.</> : " Merci de contacter directement le restaurant."}
          </p>
        ) : r.status === "cancelled" ? (
          <a href={`/r/${restaurant.slug}`} className="inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white">
            Réserver une autre date
          </a>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-100 pt-4 text-sm text-stone-500">
          {active && <a href={`/reservation/${r.token}/ics`} className="underline">Ajouter à mon agenda</a>}
          {restaurant.address && <span>📍 {[restaurant.address, restaurant.city].filter(Boolean).join(", ")}</span>}
          {restaurant.phone && <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>📞 {restaurant.phone}</a>}
        </div>
      </main>
    </div>
  );
}
