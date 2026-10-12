"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireRestaurantAction } from "@/lib/data";
import { mealMinutes } from "@/lib/calendar";
import { isValidDate, todayIn } from "@/lib/format";
import { emailClient } from "@/lib/notifications";
import { siteUrl } from "@/lib/site";
import type { Closure, Reservation } from "@/lib/types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export type SlotInfo = { time: string; remaining: number; past: boolean; closed: boolean };

/**
 * Créneaux d'une journée pour la saisie au téléphone : tous les horaires d'ouverture, avec les couverts
 * restants (limite par créneau), grisés s'ils sont passés ou fermés. Le restaurateur peut tout de même
 * saisir une autre heure.
 */
export async function daySlots(date: string): Promise<SlotInfo[]> {
  if (!isValidDate(date)) return [];
  const { supabase, restaurant } = await requireRestaurantAction();
  const [{ data: rows }, { data: closures }] = await Promise.all([
    supabase.from("reservations").select("time, party_size").eq("restaurant_id", restaurant.id).eq("date", date).in("status", ["pending", "confirmed", "seated"]),
    supabase.from("closures").select("*").eq("restaurant_id", restaurant.id).eq("date", date),
  ]);
  const booked = new Map<string, number>();
  for (const r of rows ?? []) booked.set(r.time.slice(0, 5), (booked.get(r.time.slice(0, 5)) ?? 0) + r.party_size);

  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  const nowParts = new Intl.DateTimeFormat("fr-FR", { timeZone: restaurant.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const isToday = date === todayIn(restaurant.timezone);
  const slots = new Map<string, SlotInfo>();
  for (const range of restaurant.opening_hours[dow] ?? []) {
    for (let m = toMin(range.start); m <= toMin(range.end); m += restaurant.slot_minutes) {
      const time = fromMin(m);
      const closed = ((closures ?? []) as Closure[]).some(
        (c) => time >= (c.start_time?.slice(0, 5) ?? "00:00") && (!c.end_time || time < c.end_time.slice(0, 5)),
      );
      slots.set(time, {
        time,
        remaining: restaurant.max_covers_per_slot - (booked.get(time) ?? 0),
        past: isToday && time <= nowParts,
        closed,
      });
    }
  }
  return [...slots.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export type TableOption = { id: string; label: string; seats: number; free: boolean };

/** Tables libres pendant tout le repas, et la plus petite table adaptée en suggestion. */
export async function tableOptions(date: string, time: string, party: number): Promise<{ tables: TableOption[]; suggested: string | null }> {
  if (!isValidDate(date) || !TIME.test(time)) return { tables: [], suggested: null };
  const { supabase, restaurant } = await requireRestaurantAction();
  const minutes = mealMinutes(restaurant, time);
  const end = new Date(Date.UTC(2000, 0, 1, 0, toMin(time) + minutes));
  const endDate = end.getUTCDate() > 1 ? new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : date;
  const range = `[${date} ${time},${endDate} ${fromMin(end.getUTCHours() * 60 + end.getUTCMinutes())})`;

  const [{ data: tables }, { data: busy }] = await Promise.all([
    supabase.from("dining_tables").select("id, label, seats, min_seats").eq("restaurant_id", restaurant.id).order("label"),
    supabase.from("reservation_tables").select("table_id").eq("restaurant_id", restaurant.id).filter("during", "ov", range),
  ]);
  const taken = new Set((busy ?? []).map((b) => b.table_id));
  const list = (tables ?? []).map((t) => ({ id: t.id, label: t.label, seats: t.seats, free: !taken.has(t.id), min: t.min_seats }));
  const suggested =
    list
      .filter((t) => t.free && t.seats >= party && t.min <= party)
      .sort((a, b) => a.seats - b.seats)[0]?.id ?? null;
  return { tables: list.map((t) => ({ id: t.id, label: t.label, seats: t.seats, free: t.free })), suggested };
}

export type CustomerHit = { id: string; name: string; phone: string | null; email: string | null; reservations: number; noShows: number };

/** Clients existants dont le nom, l'e-mail ou le téléphone correspond (autocomplétion). */
export async function searchCustomers(query: string): Promise<CustomerHit[]> {
  const q = query.replace(/[,()*%\\]/g, " ").trim().slice(0, 60);
  if (q.length < 2) return [];
  const { supabase, restaurant } = await requireRestaurantAction();
  const digits = q.replace(/\D/g, "");
  const filters = [`name.ilike.%${q}%`, `email.ilike.%${q}%`];
  if (digits.length >= 3) filters.push(`phone_key.like.%${digits.slice(-9)}%`);
  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, email, reservation_count, no_show_count")
    .eq("restaurant_id", restaurant.id)
    .or(filters.join(","))
    .order("reservation_count", { ascending: false })
    .limit(6);
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, reservations: c.reservation_count, noShows: c.no_show_count }));
}

export type QuickResult = { ok: true; message: string } | { ok: false; error: string };

/** Réservation saisie au téléphone ou sur place, depuis le panneau « Nouvelle réservation ». */
export async function quickCreateReservation(input: {
  date: string;
  time: string;
  party: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  tableId: string | null;
  sendEmail: boolean;
}): Promise<QuickResult> {
  const { supabase, restaurant } = await requireRestaurantAction();
  const name = input.name.trim().slice(0, 120);
  const phone = input.phone.trim().slice(0, 40) || null;
  const email = input.email.trim().toLowerCase().slice(0, 200) || null;
  if (!isValidDate(input.date) || !TIME.test(input.time)) return { ok: false, error: "Choisissez une date et une heure." };
  if (!Number.isInteger(input.party) || input.party < 1 || input.party > 100) return { ok: false, error: "Nombre de couverts invalide." };
  if (name.length < 2) return { ok: false, error: "Indiquez le nom du client." };
  if (!phone && !email) return { ok: false, error: "Indiquez un téléphone ou un e-mail pour pouvoir joindre le client." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Adresse e-mail invalide." };

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      restaurant_id: restaurant.id,
      date: input.date,
      time: input.time,
      party_size: input.party,
      name,
      phone,
      email,
      notes: input.notes.trim().slice(0, 1000) || null,
      status: "confirmed",
      source: "admin",
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  // Table choisie, sinon la meilleure table libre.
  let placement = "";
  if (input.tableId) {
    const { error: e } = await supabase.rpc("assign_tables", { p_reservation: data.id, p_tables: [input.tableId] });
    if (e) placement = " · table déjà prise, placez-la depuis le plan";
  } else {
    const { data: tables } = await supabase.rpc("auto_assign", { p_reservation: data.id });
    if (!tables) placement = " · aucune table libre adaptée";
  }
  if (!placement) {
    const { data: placed } = await supabase.from("reservation_tables").select("dining_tables(label)").eq("reservation_id", data.id);
    const labels = (placed ?? []).map((p) => (p.dining_tables as unknown as { label: string } | null)?.label).filter(Boolean);
    if (labels.length) placement = ` · table ${labels.join(" + ")}`;
  }

  if (email && input.sendEmail) {
    const base = await siteUrl();
    after(() => emailClient("confirmed", data as Reservation, restaurant, base));
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Réservation enregistrée : ${name}, ${input.party} pers.${placement}` };
}
