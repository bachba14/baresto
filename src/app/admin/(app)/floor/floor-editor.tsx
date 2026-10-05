"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { FloorView } from "@/components/floor/floor-view";
import type { DiningTable, Room, TableShape } from "@/lib/types";
import { deleteRoom, saveRoom } from "./actions";

const SHAPE_LABELS: Record<TableShape, string> = { round: "Ronde", square: "Carrée", rect: "Rectangulaire" };

export function FloorEditor({
  room: initialRoom,
  initialTables,
  canDelete,
}: {
  room: Room;
  initialTables: DiningTable[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [tables, setTables] = useState(initialTables);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = tables.find((t) => t.id === selectedId);

  const change = (id: string, patch: Partial<DiningTable>) => {
    setTables((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
    setMessage(null);
  };

  const nextLabel = () => {
    const prefix = tables[0]?.label.match(/^[A-Za-z]+/)?.[0] ?? "T";
    const nums = tables.map((t) => Number(t.label.replace(/^\D+/, ""))).filter((n) => !isNaN(n));
    return `${prefix}${Math.max(0, ...nums) + 1}`;
  };

  const addTable = (seats: number, shape: TableShape) => {
    const t: DiningTable = {
      id: `new-${crypto.randomUUID()}`,
      room_id: room.id,
      label: nextLabel(),
      seats,
      min_seats: seats <= 2 ? 1 : Math.ceil(seats / 2),
      shape,
      x: Math.round(room.width * 5) / 10,
      y: Math.round(room.depth * 5) / 10,
      rotation: 0,
      combine_group: null,
      bookable_online: true,
    };
    setTables((ts) => [...ts, t]);
    setSelectedId(t.id);
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveRoom(room, tables);
      if ("error" in result) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setTables(result.tables);
      // Les nouvelles tables ont reçu un id définitif : on garde la sélection par nom.
      setSelectedId((id) => result.tables.find((t) => t.label === tables.find((x) => x.id === id)?.label)?.id ?? null);
      setDirty(false);
      setMessage({ ok: true, text: "Plan enregistré ✓" });
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <section className={`${cardClass} space-y-3`}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className={labelClass}>Nom</span>
            <input
              value={room.name}
              onChange={(e) => {
                setRoom({ ...room, name: e.target.value });
                setDirty(true);
              }}
              className={inputClass}
            />
          </label>
          {(["width", "depth"] as const).map((k) => (
            <label key={k} className="w-28">
              <span className={labelClass}>{k === "width" ? "Largeur (m)" : "Profondeur (m)"}</span>
              <input
                type="number"
                min={2}
                max={100}
                step={0.5}
                value={room[k]}
                onChange={(e) => {
                  setRoom({ ...room, [k]: Number(e.target.value) });
                  setDirty(true);
                }}
                className={inputClass}
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 text-sm">
          <span className="self-center text-stone-500">Ajouter :</span>
          {[
            [2, "square"],
            [4, "square"],
            [4, "round"],
            [6, "rect"],
            [8, "rect"],
          ].map(([seats, shape]) => (
            <button
              key={`${seats}${shape}`}
              type="button"
              onClick={() => addTable(seats as number, shape as TableShape)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 hover:bg-stone-50"
            >
              + {seats} pl. {shape === "round" ? "ronde" : shape === "rect" ? "rect." : "carrée"}
            </button>
          ))}
        </div>

        <FloorView
          room={room}
          tables={tables}
          selectedIds={selectedId ? [selectedId] : []}
          onSelectTable={(id) => setSelectedId(id)}
          onMoveTable={(id, x, y) => change(id, { x, y })}
        />
        <p className="text-xs text-stone-500">Faites glisser les tables sur le plan 2D. Grille : 1 m.</p>

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
          >
            {pending ? "Enregistrement…" : "Enregistrer le plan"}
          </button>
          {dirty && !pending && <span className="text-sm text-amber-700">Modifications non enregistrées</span>}
          {message && <span className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</span>}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Supprimer la salle « ${room.name} » et ses tables ?`))
                  startTransition(async () => {
                    await deleteRoom(room.id);
                    router.push("/admin/floor");
                  });
              }}
              className="ml-auto text-sm text-red-600 hover:underline"
            >
              Supprimer la salle
            </button>
          )}
        </div>
      </section>

      <aside className={`${cardClass} h-fit space-y-3`}>
        {!selected ? (
          <p className="text-sm text-stone-500">Cliquez sur une table pour la modifier.</p>
        ) : (
          <>
            <h2 className="font-semibold">Table {selected.label}</h2>
            <label className="block">
              <span className={labelClass}>Nom</span>
              <input value={selected.label} onChange={(e) => change(selected.id, { label: e.target.value })} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={labelClass}>Places</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={selected.seats}
                  onChange={(e) => change(selected.id, { seats: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Minimum</span>
                <input
                  type="number"
                  min={1}
                  max={selected.seats}
                  value={selected.min_seats}
                  onChange={(e) => change(selected.id, { min_seats: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="-mt-1 text-xs text-stone-500">
              Minimum : évite de placer 1 personne sur une table de {selected.seats}.
            </p>
            <label className="block">
              <span className={labelClass}>Forme</span>
              <select value={selected.shape} onChange={(e) => change(selected.id, { shape: e.target.value as TableShape })} className={inputClass}>
                {(Object.keys(SHAPE_LABELS) as TableShape[]).map((s) => (
                  <option key={s} value={s}>{SHAPE_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <div>
              <span className={labelClass}>Rotation</span>
              <div className="flex gap-1">
                {[0, 45, 90, 135].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => change(selected.id, { rotation: r })}
                    className={`flex-1 rounded-lg border px-2 py-1 text-sm ${
                      selected.rotation === r ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"
                    }`}
                  >
                    {r}°
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className={labelClass}>Groupe combinable</span>
              <input
                value={selected.combine_group ?? ""}
                onChange={(e) => change(selected.id, { combine_group: e.target.value || null })}
                placeholder="ex. A"
                className={inputClass}
              />
              <span className="text-xs text-stone-500">
                Deux tables du même groupe peuvent être collées pour un grand groupe.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.bookable_online}
                onChange={(e) => change(selected.id, { bookable_online: e.target.checked })}
              />
              Réservable en ligne
            </label>
            <p className="-mt-2 text-xs text-stone-500">Décochez pour garder la table pour les clients sans réservation.</p>
            <div className="flex gap-2 border-t border-stone-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  const copy = { ...selected, id: `new-${crypto.randomUUID()}`, label: nextLabel(), x: selected.x + 1 };
                  setTables((ts) => [...ts, copy]);
                  setSelectedId(copy.id);
                  setDirty(true);
                }}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
              >
                Dupliquer
              </button>
              <button
                type="button"
                onClick={() => {
                  setTables((ts) => ts.filter((t) => t.id !== selected.id));
                  setSelectedId(null);
                  setDirty(true);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Supprimer
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
