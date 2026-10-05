import type { DiningTable, PlacedReservation } from "./types";

// Toutes les dimensions sont en mètres. Repère : x vers la droite, y vers le fond de la salle.

export function tableSize(t: Pick<DiningTable, "shape" | "seats">) {
  if (t.shape === "round") {
    const d = t.seats <= 2 ? 0.7 : t.seats <= 4 ? 0.9 : t.seats <= 6 ? 1.2 : 1.5;
    return { w: d, d };
  }
  if (t.shape === "square") {
    const s = t.seats <= 2 ? 0.7 : 0.8;
    return { w: s, d: s };
  }
  return { w: Math.max(1.2, Math.ceil(t.seats / 2) * 0.6 + 0.2), d: 0.8 };
}

/** Positions des chaises autour de la table, relatives à son centre (avant rotation). */
export function chairPositions(t: Pick<DiningTable, "shape" | "seats">) {
  const { w, d } = tableSize(t);
  const gap = 0.28;
  const chairs: { x: number; y: number; angle: number }[] = [];

  if (t.shape === "round") {
    const r = w / 2 + gap;
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      chairs.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, angle: a });
    }
    return chairs;
  }

  if (t.shape === "rect") {
    const top = Math.ceil(t.seats / 2);
    const bottom = t.seats - top;
    const spread = (n: number, y: number, angle: number) => {
      for (let i = 0; i < n; i++) chairs.push({ x: -w / 2 + (w / n) * (i + 0.5), y, angle });
    };
    spread(top, -d / 2 - gap, -Math.PI / 2);
    spread(bottom, d / 2 + gap, Math.PI / 2);
    return chairs;
  }

  // Carrée : haut, bas, puis gauche, droite.
  const sides = [
    { x: 0, y: -d / 2 - gap, angle: -Math.PI / 2, along: "x" },
    { x: 0, y: d / 2 + gap, angle: Math.PI / 2, along: "x" },
    { x: -w / 2 - gap, y: 0, angle: Math.PI, along: "y" },
    { x: w / 2 + gap, y: 0, angle: 0, along: "y" },
  ] as const;
  const perSide = [0, 0, 0, 0];
  for (let i = 0; i < t.seats; i++) perSide[i % 4]++;
  sides.forEach((s, i) => {
    const n = perSide[i];
    for (let k = 0; k < n; k++) {
      const offset = n === 1 ? 0 : -0.25 + (0.5 / (n - 1)) * k;
      chairs.push(s.along === "x" ? { x: offset, y: s.y, angle: s.angle } : { x: s.x, y: offset, angle: s.angle });
    }
  });
  return chairs;
}

// ── Occupation ─────────────────────────────────────────────

export type TableState = "free" | "soon" | "reserved" | "seated";

export const STATE_COLORS: Record<TableState, string> = {
  free: "#10b981",
  soon: "#f59e0b",
  reserved: "#3b82f6",
  seated: "#ef4444",
};

export const STATE_LABELS: Record<TableState, string> = {
  free: "Libre",
  soon: "Arrive bientôt",
  reserved: "Réservée",
  seated: "Installée",
};

/** "19:30" ou "19:30:00" → 1170 */
export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const ACTIVE = new Set(["pending", "confirmed", "seated"]);
const SOON_MINUTES = 60;

/** État de chaque table à un instant donné de la journée. */
export function tableStates(reservations: PlacedReservation[], at: number) {
  const states = new Map<string, { state: TableState; reservation: PlacedReservation }>();
  const rank: Record<TableState, number> = { free: 0, soon: 1, reserved: 2, seated: 3 };

  for (const r of reservations) {
    if (!ACTIVE.has(r.status)) continue;
    const start = toMinutes(r.time);
    const end = start + (r.duration_minutes ?? 120);
    let state: TableState | null = null;
    if (at >= start && at < end) state = r.status === "seated" ? "seated" : "reserved";
    else if (start > at && start - at <= SOON_MINUTES) state = "soon";
    if (!state) continue;

    for (const id of r.table_ids) {
      const current = states.get(id);
      if (!current || rank[state] > rank[current.state]) states.set(id, { state, reservation: r });
    }
  }
  return states;
}
