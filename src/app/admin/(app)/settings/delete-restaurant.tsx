"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { requestDeletion } from "./actions";

/** Suppression du restaurant : saisie du nom pour confirmer, puis délai de 30 jours annulable. */
export function DeleteRestaurant({ name, upcoming }: { name: string; upcoming: number }) {
  const [error, action] = useActionState(requestDeletion, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
      >
        Supprimer mon restaurant…
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
      <ul className="ml-5 list-disc space-y-1 text-sm text-red-900">
        <li>Votre page publique, vos widgets et les réservations en ligne sont coupés immédiatement.</li>
        <li>Vous gardez l&apos;accès au back-office pendant 30 jours pour exporter vos données, et pouvez tout annuler.</li>
        <li>Ensuite, tout est effacé définitivement : réservations, clients, carte, plan de salle, équipe et comptes.</li>
        {upcoming > 0 && (
          <li className="font-medium">
            {upcoming} réservation{upcoming > 1 ? "s" : ""} à venir : les clients ne sont pas prévenus automatiquement. Annulez-les
            depuis la page Réservations pour qu&apos;ils reçoivent un e-mail.
          </li>
        )}
      </ul>
      <label className="block">
        <span className={labelClass}>Pour confirmer, tapez le nom du restaurant : « {name} »</span>
        <input name="confirm" required autoComplete="off" className={inputClass} />
      </label>
      {error && <p className="rounded-lg bg-white p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" className="ring-1 ring-red-300">Supprimer le restaurant</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white">
          Annuler
        </button>
      </div>
    </form>
  );
}
