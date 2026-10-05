"use client";

import { DAY_ORDER, DAYS } from "@/lib/format";
import type { OpeningHours } from "@/lib/types";

/** Horaires de réservation par jour : un ou plusieurs services (première → dernière arrivée). */
export function HoursEditor({ value, onChange }: { value: OpeningHours; onChange: (hours: OpeningHours) => void }) {
  const set = (day: number, ranges: OpeningHours[string]) => onChange({ ...value, [day]: ranges });

  return (
    <div className="divide-y divide-stone-100">
      {DAY_ORDER.map((d) => {
        const ranges = value[d] ?? [];
        return (
          <div key={d} className="flex flex-wrap items-center gap-2 py-2">
            <span className="w-24 text-sm font-medium">{DAYS[d]}</span>
            {ranges.length === 0 && <span className="text-sm text-stone-400">Fermé</span>}
            {ranges.map((r, i) => (
              <span key={i} className="flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1">
                <input
                  type="time"
                  value={r.start}
                  onChange={(e) => set(d, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                  className="bg-transparent text-sm"
                  aria-label="Première arrivée"
                />
                →
                <input
                  type="time"
                  value={r.end}
                  onChange={(e) => set(d, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                  className="bg-transparent text-sm"
                  aria-label="Dernière arrivée"
                />
                <button
                  type="button"
                  onClick={() => set(d, ranges.filter((_, j) => j !== i))}
                  className="px-1 text-stone-400 hover:text-red-600"
                  aria-label="Retirer"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => set(d, [...ranges, ranges.length ? { start: "19:00", end: "21:30" } : { start: "12:00", end: "13:30" }])}
              className="text-sm text-stone-600 underline"
            >
              + service
            </button>
            {d !== 1 && ranges.length === 0 && (value[1] ?? []).length > 0 && (
              <button type="button" onClick={() => set(d, value[1])} className="text-xs text-stone-400 hover:text-stone-700">
                comme lundi
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
