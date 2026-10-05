"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardClass } from "@/components/admin-styles";
import { FloorView } from "@/components/floor/floor-view";
import { fromMinutes, tableStates, toMinutes } from "@/lib/floor";
import { formatTime, STATUS_LABELS } from "@/lib/format";
import type { DiningTable, PlacedReservation, ReservationStatus, Room } from "@/lib/types";
import { updateStatus } from "../reservations/actions";
import { assignTables, autoAssign, autoAssignAll } from "./actions";

const ACTIVE = new Set<ReservationStatus>(["pending", "confirmed", "seated"]);

export function ServiceBoard({
  date,
  isToday,
  rooms,
  tables,
  reservations,
  initialTime,
}: {
  date: string;
  isToday: boolean;
  rooms: Room[];
  tables: DiningTable[];
  reservations: PlacedReservation[];
  initialTime: number;
}) {
  const router = useRouter();
  const [time, setTime] = useState(initialTime);
  const [roomId, setRoomId] = useState(rooms[0]?.id);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const roomTables = tables.filter((t) => t.room_id === room.id);
  const tableLabel = useMemo(() => new Map(tables.map((t) => [t.id, t.label])), [tables]);
  const active = reservations.filter((r) => ACTIVE.has(r.status));
  const unplaced = active.filter((r) => r.table_ids.length === 0);
  const selectedRes = reservations.find((r) => r.id === selectedResId);

  const occupancy = useMemo(() => tableStates(reservations, time), [reservations, time]);
  const states = useMemo(() => {
    return new Map(
      [...occupancy].map(([id, s]) => [
        id,
        { state: s.state, label: `${s.reservation.name.split(" ")[0]} · ${s.reservation.party_size}p${s.state === "soon" ? " " + formatTime(s.reservation.time) : ""}` },
      ]),
    );
  }, [occupancy]);

  const run = (fn: () => Promise<string | null>, success?: string) =>
    startTransition(async () => {
      const err = await fn();
      setMessage(err ? { ok: false, text: err } : success ? { ok: true, text: success } : null);
      router.refresh();
    });

  const place = (reservationId: string, tableId: string, add: boolean) => {
    const r = reservations.find((x) => x.id === reservationId);
    if (!r) return;
    const ids = add ? [...new Set([...r.table_ids, tableId])] : [tableId];
    run(() => assignTables(reservationId, ids), `${r.name} → ${ids.map((id) => tableLabel.get(id)).join(" + ")}`);
  };

  const onTableClick = (tableId: string, { shiftKey }: { shiftKey: boolean }) => {
    if (selectedRes) return place(selectedRes.id, tableId, shiftKey);
    // Sans réservation sélectionnée : on sélectionne celle qui occupe la table.
    const occupying = occupancy.get(tableId)?.reservation;
    if (occupying) setSelectedResId(occupying.id);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Liste des réservations */}
      <aside className={`${cardClass} h-fit space-y-3 lg:sticky lg:top-4`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {active.length} réservations · {active.reduce((n, r) => n + r.party_size, 0)} couverts
          </h2>
        </div>
        {unplaced.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const { placed, failed } = await autoAssignAll(date);
                return failed ? `${placed} placée(s), ${failed} sans table disponible.` : null;
              }, `${unplaced.length} réservation(s) placée(s) automatiquement.`)
            }
            className="w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            ✨ Placer automatiquement ({unplaced.length} sans table)
          </button>
        )}
        <p className="text-xs text-stone-500">
          Glissez une réservation sur une table, ou sélectionnez-la puis cliquez sur une table.
          Maj + clic pour ajouter une table (tables collées).
        </p>

        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {active.length === 0 && <li className="text-sm text-stone-500">Aucune réservation ce jour.</li>}
          {active.map((r) => {
            const selected = r.id === selectedResId;
            return (
              <li
                key={r.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/reservation", r.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  setSelectedResId(selected ? null : r.id);
                  setTime(toMinutes(r.time));
                  const firstTable = tables.find((t) => t.id === r.table_ids[0]);
                  if (firstTable) setRoomId(firstTable.room_id);
                }}
                className={`cursor-grab rounded-lg border p-2 text-sm transition active:cursor-grabbing ${
                  selected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:border-stone-400"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{formatTime(r.time)}</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="font-medium">{r.party_size}p</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs">
                  {r.table_ids.length ? (
                    <span className={selected ? "text-stone-300" : "text-stone-600"}>
                      Table {r.table_ids.map((id) => tableLabel.get(id)).join(" + ")}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 font-medium text-amber-800">Sans table</span>
                  )}
                  <span className={selected ? "text-stone-300" : "text-stone-500"}>{STATUS_LABELS[r.status]}</span>
                </div>
                {r.notes && <p className={`mt-1 truncate text-xs italic ${selected ? "text-stone-300" : "text-stone-500"}`}>« {r.notes} »</p>}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Plan */}
      <section className={`${cardClass} space-y-3`}>
        <div className="flex flex-wrap items-center gap-3">
          {rooms.length > 1 && (
            <div className="flex gap-1">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoomId(r.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${r.id === room.id ? "bg-stone-900 text-white" : "border border-stone-300"}`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
          <label className="flex flex-1 items-center gap-3 text-sm">
            <span className="w-14 text-lg font-semibold tabular-nums">{fromMinutes(time).replace(":", "h")}</span>
            <input
              type="range"
              min={10 * 60}
              max={24 * 60 - 15}
              step={15}
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              className="flex-1 accent-stone-900"
              aria-label="Heure affichée"
            />
          </label>
          {isToday && (
            <button type="button" onClick={() => setTime(initialTime)} className="text-sm text-stone-600 underline">
              Maintenant
            </button>
          )}
        </div>

        {selectedRes && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-100 p-2 text-sm">
            <span className="font-medium">
              {selectedRes.name} · {selectedRes.party_size}p · {formatTime(selectedRes.time)}
            </span>
            <span className="text-stone-500">→ cliquez sur une table</span>
            <div className="ml-auto flex flex-wrap gap-1">
              <button type="button" disabled={pending} onClick={() => run(() => autoAssign(selectedRes.id), "Placée automatiquement.")} className="rounded-md bg-white px-2 py-1 hover:bg-stone-50">
                ✨ Auto
              </button>
              {selectedRes.table_ids.length > 0 && (
                <button type="button" disabled={pending} onClick={() => run(() => assignTables(selectedRes.id, []), "Retirée du plan.")} className="rounded-md bg-white px-2 py-1 hover:bg-stone-50">
                  Retirer de la table
                </button>
              )}
              {selectedRes.status === "pending" && (
                <button type="button" disabled={pending} onClick={() => run(async () => (await updateStatus(selectedRes.id, "confirmed"), null))} className="rounded-md bg-white px-2 py-1 hover:bg-stone-50">
                  Confirmer
                </button>
              )}
              {selectedRes.status !== "seated" && (
                <button type="button" disabled={pending} onClick={() => run(async () => (await updateStatus(selectedRes.id, "seated"), null))} className="rounded-md bg-white px-2 py-1 hover:bg-stone-50">
                  Installer
                </button>
              )}
              <button type="button" onClick={() => setSelectedResId(null)} className="rounded-md px-2 py-1 text-stone-500">
                ✕
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={`rounded-lg p-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>
        )}

        <div className={pending ? "pointer-events-none opacity-60 transition" : "transition"}>
          <FloorView
            legend
            room={room}
            tables={roomTables}
            states={states}
            selectedIds={selectedRes?.table_ids ?? []}
            onSelectTable={onTableClick}
            onDropReservation={(tableId, reservationId) => place(reservationId, tableId, false)}
          />
        </div>
      </section>
    </div>
  );
}
