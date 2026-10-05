"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Floor2D, type FloorViewProps } from "./floor-2d";
import { STATE_COLORS, STATE_LABELS, type TableState } from "@/lib/floor";

// three.js ne fonctionne que dans le navigateur.
const Floor3D = dynamic(() => import("./floor-3d"), {
  ssr: false,
  loading: () => <div className="flex aspect-[4/3] items-center justify-center text-sm text-stone-500">Chargement de la 3D…</div>,
});

/** Plan de salle avec bascule 2D / 3D. */
export function FloorView(props: FloorViewProps & { legend?: boolean; defaultMode?: "2d" | "3d" }) {
  const [mode, setMode] = useState<"2d" | "3d">(props.defaultMode ?? "2d");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
          {(["2d", "3d"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 ${mode === m ? "bg-stone-900 text-white" : "text-stone-600"}`}
            >
              {m === "2d" ? "Plan 2D" : "Vue 3D"}
            </button>
          ))}
        </div>
        {props.legend && (
          <div className="flex flex-wrap gap-3 text-xs text-stone-600">
            {(Object.keys(STATE_LABELS) as TableState[]).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full" style={{ background: STATE_COLORS[s] }} />
                {STATE_LABELS[s]}
              </span>
            ))}
          </div>
        )}
      </div>
      {mode === "2d" ? (
        <Floor2D {...props} />
      ) : (
        <>
          <Floor3D {...props} />
          <p className="mt-1 text-xs text-stone-500">
            Glisser pour tourner · molette pour zoomer · clic droit pour déplacer
            {props.onMoveTable && " · le déplacement des tables se fait sur le plan 2D"}
          </p>
        </>
      )}
    </div>
  );
}
