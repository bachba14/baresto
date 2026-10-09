"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { addClosure } from "./actions";

/** Ajout d'une fermeture : un jour ou une période, journée entière / midi / soir / horaires précis. */
export function ClosureForm({ today }: { today: string }) {
  const [result, action, pending] = useActionState(addClosure, null);
  const [mode, setMode] = useState("day");
  const [from, setFrom] = useState(today);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <label>
        <span className={labelClass}>Du</span>
        <input type="date" name="date" required min={today} value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Au (facultatif)</span>
        <input type="date" name="date_to" min={from} className={inputClass} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelClass}>Fermé</span>
        <select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
          <option value="day">Toute la journée</option>
          <option value="lunch">Le midi seulement</option>
          <option value="dinner">Le soir seulement</option>
          <option value="custom">Horaires précis (ex. à partir de minuit, soirée privée…)</option>
        </select>
      </label>
      {mode === "custom" && (
        <>
          <label>
            <span className={labelClass}>À partir de</span>
            <input type="time" name="start_time" className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Jusqu&apos;à</span>
            <input type="time" name="end_time" className={inputClass} />
          </label>
          <p className="self-end pb-2 text-xs text-stone-500 sm:col-span-2">
            Laissez « jusqu&apos;à » vide pour fermer jusqu&apos;à la fin de la journée.
          </p>
        </>
      )}
      <label className="sm:col-span-3">
        <span className={labelClass}>Motif (facultatif)</span>
        <input name="reason" placeholder="Congés, privatisation, jour férié…" maxLength={200} className={inputClass} />
      </label>
      <div className="flex items-end gap-3">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50">
          {pending ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {result?.error && <p className="text-sm text-red-700 sm:col-span-4">{result.error}</p>}
      {result?.ok && !pending && <p className="text-sm text-emerald-700 sm:col-span-4">{result.ok}</p>}
    </form>
  );
}
