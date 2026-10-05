"use client";

import { useRef, useState } from "react";
import { chairPositions, STATE_COLORS, tableSize, type TableState } from "@/lib/floor";
import type { DiningTable, Room } from "@/lib/types";

export type FloorViewProps = {
  room: Room;
  tables: DiningTable[];
  states?: Map<string, { state: TableState; label?: string }>;
  selectedIds?: string[];
  onSelectTable?: (id: string, e: { shiftKey: boolean }) => void;
  /** Mode éditeur : déplacement des tables à la souris. */
  onMoveTable?: (id: string, x: number, y: number) => void;
  /** Dépôt d'une réservation (glisser-déposer) sur une table. */
  onDropReservation?: (tableId: string, reservationId: string) => void;
};

const SNAP = 0.1;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

export function Floor2D({ room, tables, states, selectedIds = [], onSelectTable, onMoveTable, onDropReservation }: FloorViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const moved = useRef(false); // distingue un déplacement d'un simple clic
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const pad = 0.6;

  const toRoom = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-pad} ${-pad} ${room.width + pad * 2} ${room.depth + pad * 2}`}
      className="h-auto w-full touch-none select-none"
      onPointerMove={(e) => {
        if (!drag || !onMoveTable) return;
        const p = toRoom(e.clientX, e.clientY);
        const x = Math.min(room.width, Math.max(0, snap(p.x - drag.dx)));
        const y = Math.min(room.depth, Math.max(0, snap(p.y - drag.dy)));
        onMoveTable(drag.id, x, y);
        moved.current = true;
      }}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
    >
      {/* Sol avec grille de 1 m */}
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#e7e5e4" strokeWidth="0.02" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={room.width} height={room.depth} fill="#fafaf9" />
      <rect x={0} y={0} width={room.width} height={room.depth} fill="url(#grid)" stroke="#78716c" strokeWidth="0.08" />
      <text x={room.width / 2} y={-0.2} textAnchor="middle" fontSize="0.28" fill="#a8a29e">
        {room.name} · {room.width} × {room.depth} m
      </text>

      {tables.map((t) => {
        const { w, d } = tableSize(t);
        const st = states?.get(t.id);
        const fill = st ? STATE_COLORS[st.state] : states ? STATE_COLORS.free : "#d6d3d1";
        const selected = selectedIds.includes(t.id);
        const isDrop = dropTarget === t.id;

        return (
          <g
            key={t.id}
            transform={`translate(${t.x} ${t.y}) rotate(${t.rotation})`}
            className={onMoveTable ? "cursor-move" : "cursor-pointer"}
            onPointerDown={(e) => {
              if (!onMoveTable) return;
              (e.target as Element).setPointerCapture?.(e.pointerId);
              const p = toRoom(e.clientX, e.clientY);
              moved.current = false;
              setDrag({ id: t.id, dx: p.x - t.x, dy: p.y - t.y });
            }}
            onClick={(e) => {
              if (moved.current) return;
              onSelectTable?.(t.id, { shiftKey: e.shiftKey });
            }}
            onDragOver={(e) => {
              if (!onDropReservation) return;
              e.preventDefault();
              setDropTarget(t.id);
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => {
              setDropTarget(null);
              const id = e.dataTransfer.getData("text/reservation");
              if (id && onDropReservation) onDropReservation(t.id, id);
            }}
          >
            {chairPositions(t).map((c, i) => (
              <rect
                key={i}
                x={c.x - 0.18}
                y={c.y - 0.18}
                width={0.36}
                height={0.36}
                rx={0.08}
                fill="#e7e5e4"
                stroke="#a8a29e"
                strokeWidth={0.02}
              />
            ))}
            {t.shape === "round" ? (
              <circle r={w / 2} fill={fill} fillOpacity={0.85} />
            ) : (
              <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={0.06} fill={fill} fillOpacity={0.85} />
            )}
            {(selected || isDrop) &&
              (t.shape === "round" ? (
                <circle r={w / 2 + 0.08} fill="none" stroke={isDrop ? "#7c3aed" : "#1c1917"} strokeWidth={0.06} />
              ) : (
                <rect x={-w / 2 - 0.08} y={-d / 2 - 0.08} width={w + 0.16} height={d + 0.16} rx={0.1} fill="none" stroke={isDrop ? "#7c3aed" : "#1c1917"} strokeWidth={0.06} />
              ))}
            <g transform={`rotate(${-t.rotation})`}>
              <text textAnchor="middle" y={st?.label ? -0.02 : 0.1} fontSize="0.26" fontWeight="700" fill="#fff">
                {t.label}
              </text>
              <text textAnchor="middle" y={st?.label ? 0.22 : 0.34} fontSize="0.15" fill="#fff">
                {st?.label ? (st.label.length > 10 ? `${st.label.slice(0, 9)}…` : st.label) : `${t.seats} pl.`}
              </text>
              {!t.bookable_online && !states && (
                <text textAnchor="middle" y={-0.22} fontSize="0.14" fill="#fff">hors ligne</text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
