"use client";

import { useState, useTransition } from "react";
import { cardClass } from "@/components/admin-styles";
import { forgetCustomer } from "../actions";

/** RGPD : suppression de la fiche client (administrateurs). */
export function ForgetCustomer({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const question =
      `Supprimer définitivement la fiche de ${name} ?\n\n` +
      "Son nom, son e-mail, son téléphone et ses remarques seront effacés de toutes ses réservations passées, " +
      "qui resteront dans les statistiques sous « Client supprimé ». Action irréversible.";
    if (!window.confirm(question)) return;
    startTransition(async () => setError(await forgetCustomer(id)));
  };

  return (
    <section className={`${cardClass} space-y-2`}>
      <h2 className="font-semibold">Supprimer ce client</h2>
      <p className="text-sm text-stone-500">
        À faire si le client vous le demande (droit à l&apos;effacement, RGPD). Ses réservations passées sont anonymisées
        et restent comptées dans vos statistiques.
      </p>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Suppression…" : "Supprimer ce client"}
      </button>
    </section>
  );
}
