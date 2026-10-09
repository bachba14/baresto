export type TimeRange = { start: string; end: string };

/** Clés "0" (dimanche) à "6" (samedi). */
export type OpeningHours = Record<string, TimeRange[]>;

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cuisine: string | null;
  city: string | null;
  onboarding_completed: boolean;
  logo_url: string | null;
  primary_color: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  opening_hours: OpeningHours;
  slot_minutes: number;
  max_covers_per_slot: number;
  max_party_size: number;
  booking_days_ahead: number;
  min_notice_minutes: number;
  auto_confirm: boolean;
  reservation_message: string | null;
  lunch_minutes: number;
  dinner_minutes: number;
  dinner_from: string;
  review_url: string | null;
  send_reminders: boolean;
  /** Délai (heures avant le repas) jusqu'auquel le client peut modifier ou annuler en ligne. */
  cancel_deadline_hours: number;
};

/** Fermeture exceptionnelle : journée entière si start_time et end_time sont vides. */
export type Closure = {
  id: string;
  restaurant_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  is_visible: boolean;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  tags: string[];
  allergens: string[];
  is_available: boolean;
  position: number;
};

export type ReservationStatus = "pending" | "confirmed" | "seated" | "cancelled" | "no_show";

export type Reservation = {
  restaurant_id: string;
  id: string;
  date: string;
  time: string;
  party_size: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ReservationStatus;
  source: "widget" | "admin";
  duration_minutes: number | null;
  token: string;
  customer_id: string | null;
  reminder_sent_at: string | null;
  review_requested_at: string | null;
  created_at: string;
};

export type Slot = { slot: string; remaining: number };

export type Room = {
  id: string;
  name: string;
  width: number;
  depth: number;
  position: number;
};

export type TableShape = "round" | "square" | "rect";

export type DiningTable = {
  id: string;
  room_id: string;
  label: string;
  seats: number;
  min_seats: number;
  shape: TableShape;
  x: number;
  y: number;
  rotation: number;
  combine_group: string | null;
  bookable_online: boolean;
};

/** Réservation avec ses tables affectées (ids) et la fiche client résumée. */
export type PlacedReservation = Reservation & {
  table_ids: string[];
  customer: Pick<Customer, "id" | "reservation_count" | "no_show_count" | "notes" | "tags"> | null;
};

export type Customer = {
  id: string;
  restaurant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  reservation_count: number;
  no_show_count: number;
  cancelled_count: number;
  first_date: string | null;
  last_date: string | null;
  created_at: string;
};

export type WaitlistStatus = "waiting" | "notified" | "booked" | "cancelled";

export type WaitlistEntry = {
  id: string;
  restaurant_id: string;
  date: string;
  time: string | null;
  party_size: number;
  name: string;
  email: string;
  phone: string | null;
  status: WaitlistStatus;
  notified_at: string | null;
  created_at: string;
};
