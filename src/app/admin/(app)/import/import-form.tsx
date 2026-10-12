"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { cardClass } from "@/components/admin-styles";
import { importFile } from "./actions";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function ImportForm() {
  const [result, action, pending] = useActionState(importFile, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<"check" | "import" | null>(null);

  const r = result;
  const nothingToImport = r && !r.error && r.reservations.valid + r.customers.created + r.customers.updated === 0;
  const imported = r?.mode === "import" && !r.error;

  return (
    // Envoi manuel : un formulaire à « action » se vide après envoi, ce qui retirerait le fichier
    // choisi entre « Vérifier » et « Importer ».
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(data));
      }}
    >
      <div className={cardClass}>
        <h2 className="font-semibold">2. Envoyez votre fichier</h2>
        <p className="mt-1 text-sm text-stone-500">Excel (.xlsx) ou CSV, 5 Mo maximum. Aucun e-mail n&apos;est envoyé à vos clients.</p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 px-4 py-8 text-center transition hover:border-amber-400 hover:bg-amber-50/40">
          <span className="text-2xl">📄</span>
          <span className="text-sm font-medium">{fileName ?? "Choisir un fichier"}</span>
          <span className="text-xs text-stone-500">{fileName ? "Cliquez pour en choisir un autre" : "ou glissez-le ici"}</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            name="mode"
            value="check"
            disabled={pending || !fileName}
            onClick={() => setSubmitted("check")}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-50 disabled:opacity-50"
          >
            {pending && submitted === "check" ? "Vérification…" : "Vérifier le fichier"}
          </button>
          {r?.mode === "check" && !r.error && !nothingToImport && (
            <button
              name="mode"
              value="import"
              disabled={pending}
              onClick={() => setSubmitted("import")}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
            >
              {pending && submitted === "import" ? "Import en cours…" : "Importer"}
            </button>
          )}
        </div>
      </div>

      {r?.error && <p className="animate-rise rounded-xl bg-red-50 p-4 text-sm text-red-700">{r.error}</p>}

      {r && !r.error && (
        <section className={`${cardClass} animate-rise space-y-3 ${imported ? "ring-emerald-200" : ""}`}>
          <h2 className="font-semibold">
            {imported ? "✓ Import terminé" : nothingToImport ? "Rien à importer" : "Résultat de la vérification"}
          </h2>
          <ul className="space-y-1 text-sm">
            <li>
              <strong>{plural(r.reservations.valid, "réservation")}</strong> {imported ? "importée" + (r.reservations.valid > 1 ? "s" : "") : "à importer"}
              {r.reservations.valid > 0 && (
                <span className="text-stone-500"> ({r.reservations.upcoming} à venir, {r.reservations.past} passées)</span>
              )}
            </li>
            {r.reservations.duplicates > 0 && (
              <li className="text-stone-500">{plural(r.reservations.duplicates, "réservation")} déjà dans Monkomi, ignorée{r.reservations.duplicates > 1 ? "s" : ""}</li>
            )}
            <li>
              <strong>{plural(r.customers.created, "client")}</strong> {imported ? "créé" + (r.customers.created > 1 ? "s" : "") : "à créer"}
              {r.customers.updated > 0 && <> · <strong>{plural(r.customers.updated, "client")}</strong> existant{r.customers.updated > 1 ? "s" : ""} {imported ? "complété" + (r.customers.updated > 1 ? "s" : "") : "à compléter"}</>}
            </li>
            {imported && r.placed != null && r.reservations.upcoming > 0 && (
              <li>
                {plural(r.placed, "réservation")} à venir placée{r.placed > 1 ? "s" : ""} sur une table
                {!!r.unplaced && (
                  <span className="text-amber-700">
                    {" "}· {r.unplaced} sans table : placez-les depuis le <Link href="/admin/service" className="underline">plan de service</Link>
                  </span>
                )}
              </li>
            )}
          </ul>

          {r.problems.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-800">
                {plural(r.problems.length, "ligne")} ignorée{r.problems.length > 1 ? "s" : ""} — corrigez-les dans le fichier puis réimportez (les lignes déjà importées ne seront pas dupliquées) :
              </p>
              <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-stone-50">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-stone-100 text-stone-500">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Feuille</th>
                      <th className="px-3 py-1.5 font-medium">Ligne</th>
                      <th className="px-3 py-1.5 font-medium">Problème</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.problems.map((p, i) => (
                      <tr key={i} className="border-t border-stone-100">
                        <td className="px-3 py-1.5">{p.sheet}</td>
                        <td className="px-3 py-1.5 tabular-nums">{p.line}</td>
                        <td className="px-3 py-1.5">{p.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {r.mode === "check" && !nothingToImport && (
            <p className="text-sm text-stone-500">Tout est correct ? Cliquez sur « Importer » ci-dessus pour enregistrer.</p>
          )}
          {imported && (
            <p className="text-sm">
              <Link href="/admin/reservations" className="font-medium text-amber-700 underline">Voir les réservations</Link>
              {" · "}
              <Link href="/admin/clients" className="font-medium text-amber-700 underline">Voir les clients</Link>
            </p>
          )}
        </section>
      )}
    </form>
  );
}
