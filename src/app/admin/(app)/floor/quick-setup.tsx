"use client";

import { useState, useTransition } from "react";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { quickSetup, type QuickGroup } from "./actions";

const DEFAULT: QuickGroup[] = [
  { count: 4, seats: 2 },
  { count: 6, seats: 4 },
  { count: 2, seats: 6 },
];

export function QuickSetup({
  hasTables,
  alwaysOpen = false,
  onDone,
}: {
  hasTables: boolean;
  /** Mode assistant : toujours affiché, sans bouton Fermer. */
  alwaysOpen?: boolean;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(alwaysOpen || !hasTables);
  const [groups, setGroups] = useState<QuickGroup[]>(DEFAULT);
  const [roomName, setRoomName] = useState("Salle");
  const [replace, setReplace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = groups.reduce((n, g) => n + (g.count || 0), 0);
  const seats = groups.reduce((n, g) => n + (g.count || 0) * (g.seats || 0), 0);
  const update = (i: number, key: keyof QuickGroup, value: number) =>
    setGroups((gs) => gs.map((g, j) => (j === i ? { ...g, [key]: value } : g)));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-stone-700 underline">
        ⚡ Configuration rapide : générer le plan à partir du nombre de tables
      </button>
    );
  }

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">⚡ Configuration rapide</h2>
          <p className="text-sm text-stone-500">
            Indiquez simplement vos tables : le plan est généré, vous pourrez ensuite déplacer les tables si vous le souhaitez.
          </p>
        </div>
        {hasTables && !alwaysOpen && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-stone-500">Fermer</button>
        )}
      </div>

      <div className="space-y-2">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="number"
              min={0}
              max={100}
              value={g.count}
              onChange={(e) => update(i, "count", Number(e.target.value))}
              className={`${inputClass} w-20`}
              aria-label="Nombre de tables"
            />
            <span>table{g.count > 1 ? "s" : ""} de</span>
            <input
              type="number"
              min={1}
              max={30}
              value={g.seats}
              onChange={(e) => update(i, "seats", Number(e.target.value))}
              className={`${inputClass} w-20`}
              aria-label="Places par table"
            />
            <span>places</span>
            <button
              type="button"
              onClick={() => setGroups((gs) => gs.filter((_, j) => j !== i))}
              className="px-2 text-stone-400 hover:text-red-600"
              aria-label="Retirer"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setGroups((gs) => [...gs, { count: 1, seats: 8 }])}
          className="text-sm text-stone-600 underline"
        >
          + autre taille de table
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Nom de la salle</span>
          <input value={roomName} onChange={(e) => setRoomName(e.target.value)} className={inputClass} />
        </label>
        <div className="flex flex-col justify-end gap-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={replace} onChange={() => setReplace(true)} />
            Remplacer tout le plan actuel
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!replace} onChange={() => setReplace(false)} />
            Ajouter comme salle supplémentaire (terrasse…)
          </label>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || total === 0}
          onClick={() => {
            if (replace && hasTables && !confirm("Remplacer tout le plan ? Les placements des réservations à venir seront retirés.")) return;
            setError(null);
            startTransition(async () => {
              const err = await quickSetup(roomName, groups, replace);
              if (err) setError(err);
              else if (onDone) onDone();
              else setOpen(false);
            });
          }}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? "Génération…" : `Générer ${total} tables (${seats} places)`}
        </button>
      </div>
    </section>
  );
}
