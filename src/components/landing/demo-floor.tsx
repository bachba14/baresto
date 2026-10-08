"use client";

import { useEffect, useMemo, useState } from "react";
import { Floor2D } from "@/components/floor/floor-2d";
import { FloorView } from "@/components/floor/floor-view";
import { fromMinutes, tableStates } from "@/lib/floor";
import { formatTime } from "@/lib/format";
import { DEMO_RESERVATIONS, DEMO_ROOM, DEMO_TABLES } from "@/lib/demo";

const START = 18 * 60 + 30;
const END = 23 * 60;

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

/** Fait avancer l'heure du service (par pas de 15 min) tant que `playing` est vrai. */
function useServiceClock(initial: number, playing: boolean, everyMs: number) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTime((t) => (t + 15 > END ? START : t + 15)), everyMs);
    return () => clearInterval(id);
  }, [playing, everyMs]);
  return [time, setTime] as const;
}

/** Aperçu « tableau de service » du hero : liste + plan 2D, qui vit tout seul. */
export function HeroService() {
  const [time] = useServiceClock(19 * 60 + 30, true, 1800);
  const states = useStates(time, true);
  const labels = new Map(DEMO_TABLES.map((t) => [t.id, t.label]));
  const upcoming = DEMO_RESERVATIONS.filter((r) => Number(r.time.slice(0, 2)) * 60 + Number(r.time.slice(3, 5)) >= time - 30);

  return (
    <div className="grid gap-3 p-3 text-left sm:grid-cols-[200px_1fr] sm:p-4">
      <div className="hidden space-y-1.5 sm:block">
        <p className="flex items-center justify-between px-1 text-xs font-semibold text-stone-500">
          Ce soir · 38 couverts
          <span className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-stone-700 tabular-nums shadow-sm">
            <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-600" />
            {fromMinutes(time).replace(":", "h")}
          </span>
        </p>
        {upcoming.slice(0, 6).map((r) => (
          <div key={r.id} className="animate-fade-up rounded-lg border border-stone-200 bg-white p-2 text-xs">
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

/** Plan interactif de la section 3D : l'heure défile jusqu'à ce que le visiteur prenne la main. */
export function InteractiveFloor() {
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useServiceClock(20 * 60, playing, 2200);
  const states = useStates(time);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs text-white transition hover:scale-105"
          aria-label={playing ? "Mettre en pause" : "Lire"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <span className="w-14 text-lg font-semibold tabular-nums">{fromMinutes(time).replace(":", "h")}</span>
        <input
          type="range"
          min={START}
          max={END}
          step={15}
          value={time}
          onChange={(e) => {
            setPlaying(false);
            setTime(Number(e.target.value));
          }}
          className="flex-1 accent-amber-700"
          aria-label="Heure du service"
        />
      </div>
      <FloorView legend autoRotate defaultMode="3d" room={DEMO_ROOM} tables={DEMO_TABLES} states={states} />
    </div>
  );
}
