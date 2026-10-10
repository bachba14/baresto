"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import type { Reservation } from "@/lib/types";
import { editReservation } from "./actions";

type Editable = Pick<Reservation, "id" | "date" | "time" | "party_size" | "name" | "email" | "phone" | "notes">;

/** Bouton « Modifier » et formulaire de modification, dépliés sous la ligne de la réservation. */
export function ReservationEditor({ r, children }: { r: Editable; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [result, action, pending] = useActionState(editReservation.bind(null, r.id), null);

  // Une modification réussie referme le formulaire.
  useEffect(() => {
    if (result?.ok && !result.ok.includes("aucune table")) {
      const t = setTimeout(() => setOpen(false), 900);
      return () => clearTimeout(t);
    }
  }, [result]);

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          {open ? "Fermer" : "Modifier"}
        </button>
        {children}
      </div>

      {open && (
        <form action={action} className="animate-rise grid w-full basis-full gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-4">
          <label>
            <span className={labelClass}>Date</span>
            <input type="date" name="date" defaultValue={r.date} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Heure</span>
            <input type="time" name="time" defaultValue={r.time.slice(0, 5)} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Couverts</span>
            <input type="number" name="party_size" min={1} max={100} defaultValue={r.party_size} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Nom</span>
            <input name="name" defaultValue={r.name} required minLength={2} maxLength={120} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Téléphone</span>
            <input name="phone" type="tel" defaultValue={r.phone ?? ""} maxLength={40} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>E-mail</span>
            <input name="email" type="email" defaultValue={r.email ?? ""} maxLength={200} className={inputClass} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Remarques</span>
            <input name="notes" defaultValue={r.notes ?? ""} maxLength={1000} className={inputClass} />
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
            <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50">
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" name="send_email" defaultChecked />
              Prévenir le client par e-mail si la date, l&apos;heure ou les couverts changent
            </label>
            {result?.error && <span className="text-sm text-red-700">{result.error}</span>}
            {result?.ok && !pending && (
              <span className={`text-sm ${result.ok.includes("aucune table") ? "text-amber-700" : "text-emerald-700"}`}>{result.ok}</span>
            )}
          </div>
        </form>
      )}
    </>
  );
}
