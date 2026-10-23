"use client";

import { useActionState, useState } from "react";
import { inputClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { pauseOnline } from "./actions";

/** Formulaire de mise en pause des réservations en ligne (l'état « en pause » est affiché par la page). */
export function PauseOnlineForm({ phone, defaultUntil }: { phone: string | null; defaultUntil: string }) {
  const [state, action] = useActionState(pauseOnline, null);
  const [mode, setMode] = useState<"manual" | "until">("manual");

  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2 text-sm">
        <legend className="sr-only">Durée de la pause</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} />
          Jusqu&apos;à ce que je rouvre
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <input type="radio" name="mode" value="until" checked={mode === "until"} onChange={() => setMode("until")} />
          Rouvrir automatiquement le
          <input
            type="datetime-local"
            name="until"
            defaultValue={defaultUntil}
            disabled={mode !== "until"}
            aria-label="Date et heure de réouverture"
            className={`${inputClass} w-auto py-1.5 disabled:opacity-50`}
          />
        </label>
      </fieldset>
      {!phone && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Ajoutez votre téléphone dans « Établissement » : il est affiché aux clients pendant la pause.
        </p>
      )}
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <SubmitButton confirm="Mettre en pause les réservations en ligne ? Votre page et vos widgets n'accepteront plus de réservation.">
        Mettre en pause
      </SubmitButton>
    </form>
  );
}
