import type { DiningTable, PlacedReservation, Room } from "./types";

// Données fictives pour les visuels de la landing page (aucun appel réseau).

export const DEMO_ROOM: Room = { id: "salle", name: "Salle", width: 12, depth: 8, position: 0 };

const t = (
  label: string,
  seats: number,
  shape: DiningTable["shape"],
  x: number,
  y: number,
  rotation = 0,
): DiningTable => ({
  id: label,
  room_id: "salle",
  label,
  seats,
  min_seats: 1,
  shape,
  x,
  y,
  rotation,
  combine_group: null,
  bookable_online: true,
});

export const DEMO_TABLES: DiningTable[] = [
  t("T1", 2, "round", 1.5, 1.3),
  t("T2", 2, "round", 3.5, 1.3),
  t("T3", 2, "round", 5.5, 1.3),
  t("T4", 2, "round", 7.5, 1.3),
  t("T5", 4, "square", 1.8, 4.2),
  t("T6", 4, "square", 3.0, 4.2),
  t("T7", 4, "square", 5.6, 4.2),
  t("T8", 4, "square", 6.8, 4.2),
  t("T9", 6, "rect", 10.3, 2.2, 90),
  t("T10", 8, "rect", 10.3, 5.8, 90),
  t("T11", 4, "round", 3.0, 6.6),
  t("T12", 4, "round", 6.2, 6.6),
];

const r = (
  time: string,
  name: string,
  party: number,
  tables: string[],
  status: PlacedReservation["status"] = "confirmed",
): PlacedReservation => ({
  id: `${name}-${time}`,
  restaurant_id: "demo",
  date: "2026-01-01",
  time: `${time}:00`,
  party_size: party,
  duration_minutes: 120,
  name,
  email: null,
  phone: null,
  notes: null,
  status,
  source: "widget",
  token: "",
  customer_id: null,
  reminder_sent_at: null,
  review_requested_at: null,
  created_at: "",
  table_ids: tables,
  customer: null,
});

export const DEMO_RESERVATIONS: PlacedReservation[] = [
  r("19:00", "Martin", 2, ["T1"], "seated"),
  r("19:00", "Dubois", 4, ["T5"], "seated"),
  r("19:15", "Laurent", 6, ["T9"], "seated"),
  r("19:30", "Bernard", 2, ["T3"]),
  r("19:30", "Petit", 7, ["T7", "T8"]),
  r("20:00", "Moreau", 4, ["T11"]),
  r("20:15", "Garcia", 2, ["T2"]),
  r("20:30", "Roux", 3, ["T12"], "pending"),
  r("21:00", "Fournier", 8, ["T10"]),
];
