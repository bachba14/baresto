"use client";

import { useMemo, useState } from "react";
import { Floor2D } from "@/components/floor/floor-2d";
import { FloorView } from "@/components/floor/floor-view";
import { fromMinutes, tableStates } from "@/lib/floor";
import { formatTime } from "@/lib/format";
import { DEMO_RESERVATIONS, DEMO_ROOM, DEMO_TABLES } from "@/lib/demo";

function useStates(time: number, short = false) {
  return useMemo(
    () =>
      new Map(
        [...tableStates(DEMO_RESERVATIONS, time)].map(([id, s]) => [
          id,
          { state: s.state, label: short ? s.reservation.name : `${s.reservation.name} · ${s.reservation.party_size}p` },
        ]),
      ),
    [time, short],
  );
}

/** Aperçu « tableau de service » du hero : liste + plan 2D. */
export function HeroService() {
  const states = useStates(20 * 60, true);
  const labels = new Map(DEMO_TABLES.map((t) => [t.id, t.label]));

  return (
    <div className="grid gap-3 p-3 text-left sm:grid-cols-[200px_1fr] sm:p-4">
      <div className="hidden space-y-1.5 sm:block">
        <p className="px-1 text-xs font-semibold text-stone-500">Ce soir · 38 couverts</p>
        {DEMO_RESERVATIONS.slice(3).map((r) => (
          <div key={r.id} className="rounded-lg border border-stone-200 bg-white p-2 text-xs">
            <div className="flex justify-between font-medium">
              <span>{formatTime(r.time)} {r.name}</span>
              <span>{r.party_size}p</span>
            </div>
            <span className="text-stone-500">Table {r.table_ids.map((id) => labels.get(id)).join(" + ")}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-white p-2">
        <Floor2D room={DEMO_ROOM} tables={DEMO_TABLES} states={states} />
      </div>
    </div>
  );
}

/** Plan interactif de la section 3D : curseur d'heure + bascule 2D/3D. */
export function InteractiveFloor() {
  const [time, setTime] = useState(20 * 60);
  const states = useStates(time);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
        <span className="w-14 text-lg font-semibold tabular-nums">{fromMinutes(time).replace(":", "h")}</span>
        <input
          type="range"
          min={18 * 60 + 30}
          max={23 * 60}
          step={15}
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          className="flex-1 accent-amber-700"
          aria-label="Heure du service"
        />
      </label>
      <FloorView legend defaultMode="3d" room={DEMO_ROOM} tables={DEMO_TABLES} states={states} />
    </div>
  );
}
