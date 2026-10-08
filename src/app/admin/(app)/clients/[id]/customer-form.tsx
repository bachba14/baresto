"use client";

import { useActionState } from "react";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import type { Customer } from "@/lib/types";
import { saveCustomer } from "../actions";

export function CustomerForm({ customer }: { customer: Customer }) {
  const [result, action, pending] = useActionState(saveCustomer.bind(null, customer.id), null);
  return (
    <form action={action} className={`${cardClass} grid gap-4 sm:grid-cols-3`}>
      <label>
        <span className={labelClass}>Nom</span>
        <input name="name" defaultValue={customer.name} required className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>E-mail</span>
        <input name="email" type="email" defaultValue={customer.email ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Téléphone</span>
        <input name="phone" type="tel" defaultValue={customer.phone ?? ""} className={inputClass} />
      </label>
      <label className="sm:col-span-3">
        <span className={labelClass}>Étiquettes (séparées par des virgules)</span>
        <input name="tags" defaultValue={customer.tags.join(", ")} placeholder="VIP, sans gluten, habitué terrasse…" className={inputClass} />
      </label>
      <label className="sm:col-span-3">
        <span className={labelClass}>Notes internes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={customer.notes ?? ""}
          placeholder="Allergie aux fruits à coque, aime la table près de la fenêtre…"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-stone-500">
          Visibles uniquement par votre équipe, sur chaque réservation de ce client.
        </span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {result === "ok" && !pending && <span className="text-sm text-emerald-700">Fiche enregistrée ✓</span>}
        {result && result !== "ok" && <span className="text-sm text-red-700">{result}</span>}
      </div>
    </form>
  );
}
