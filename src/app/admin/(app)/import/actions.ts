"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAction } from "@/lib/data";
import { todayIn } from "@/lib/format";
import { fullName, isEmail, parseDate, parseStatus, parseTime, phoneKey, readImportFile, text, type RawRow } from "@/lib/import";
import type { ReservationStatus } from "@/lib/types";

const MAX_ROWS = 5000;
const MAX_PLACED = 300; // réservations à venir placées automatiquement par import

type Problem = { sheet: "Réservations" | "Clients"; line: number; message: string };

export type ImportResult = {
  mode: "check" | "import";
  reservations: { valid: number; upcoming: number; past: number; duplicates: number };
  customers: { created: number; updated: number };
  problems: Problem[];
  placed?: number;
  unplaced?: number;
  error?: string;
} | null;

type ResRow = {
  date: string;
  time: string;
  party_size: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: ReservationStatus;
};

type CustRow = { name: string; email: string | null; phone: string | null; notes: string | null; tags: string[] };

const resKey = (r: { date: string; time: string; name: string }) => `${r.date}|${r.time.slice(0, 5)}|${r.name.trim().toLowerCase()}`;

function checkReservations(rows: RawRow[], problems: Problem[]) {
  const valid: ResRow[] = [];
  for (const { line, values: v } of rows) {
    const fail = (message: string) => problems.push({ sheet: "Réservations", line, message });
    const date = parseDate(v.date);
    const time = parseTime(v.time);
    const party = Number(String(v.party ?? "").replace(",", "."));
    const name = fullName(v);
    const email = text(v.email, 200)?.toLowerCase() ?? null;
    const status = parseStatus(v.status);
    if (!date) { fail(`Date illisible : « ${String(v.date ?? "")} »`); continue; }
    if (!time) { fail(`Heure illisible : « ${String(v.time ?? "")} »`); continue; }
    if (!Number.isInteger(party) || party < 1 || party > 100) { fail(`Nombre de couverts invalide : « ${String(v.party ?? "")} »`); continue; }
    if (!name || name.length < 2) { fail("Nom manquant"); continue; }
    if (!isEmail(email)) { fail(`E-mail invalide : « ${email} »`); continue; }
    if (!status) { fail(`Statut inconnu : « ${String(v.status)} »`); continue; }
    valid.push({ date, time, party_size: party, name, email, phone: text(v.phone, 40), notes: text(v.notes, 1000), status });
  }
  return valid;
}

function checkCustomers(rows: RawRow[], problems: Problem[]) {
  const valid: CustRow[] = [];
  for (const { line, values: v } of rows) {
    const fail = (message: string) => problems.push({ sheet: "Clients", line, message });
    const email = text(v.email, 200)?.toLowerCase() ?? null;
    const phone = text(v.phone, 40);
    const name = fullName(v) ?? email;
    if (!name) { fail("Nom manquant"); continue; }
    if (!email && !phoneKey(phone)) { fail("Il faut un e-mail ou un téléphone pour retrouver ce client"); continue; }
    if (!isEmail(email)) { fail(`E-mail invalide : « ${email} »`); continue; }
    const tags = String(v.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    valid.push({ name, email, phone, notes: text(v.notes, 1000), tags });
  }
  return valid;
}

/**
 * Import de réservations et de clients depuis un fichier Excel ou CSV.
 * mode « check » : vérifie seulement ; mode « import » : enregistre. Aucun e-mail n'est envoyé.
 */
export async function importFile(_: ImportResult, formData: FormData): Promise<ImportResult> {
  const mode = formData.get("mode") === "import" ? "import" : "check";
  const empty = { mode, reservations: { valid: 0, upcoming: 0, past: 0, duplicates: 0 }, customers: { created: 0, updated: 0 }, problems: [] } as const;
  const fail = (error: string): ImportResult => ({ ...empty, problems: [], error });

  const { supabase, restaurant } = await requireRestaurantAction();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choisissez un fichier Excel (.xlsx) ou CSV.");
  if (file.size > 5 * 1024 * 1024) return fail("Fichier trop lourd (5 Mo maximum). Découpez-le en plusieurs fichiers.");
  if (!/\.(xlsx|csv)$/i.test(file.name)) return fail("Format non pris en charge : utilisez un fichier .xlsx (Excel) ou .csv.");

  let sheets;
  try {
    sheets = await readImportFile(file);
  } catch {
    return fail("Impossible de lire ce fichier. Enregistrez-le au format Excel (.xlsx) ou CSV, puis réessayez.");
  }
  if (!sheets.reservations.length && !sheets.customers.length) {
    return fail("Aucune ligne reconnue : vérifiez que la première ligne contient les titres des colonnes (Date, Heure, Couverts, Nom…).");
  }
  if (sheets.reservations.length > MAX_ROWS || sheets.customers.length > MAX_ROWS) {
    return fail(`${MAX_ROWS} lignes maximum par feuille : découpez le fichier en plusieurs imports.`);
  }

  const problems: Problem[] = [];
  const reservations = checkReservations(sheets.reservations, problems);
  const customers = checkCustomers(sheets.customers, problems);
  const today = todayIn(restaurant.timezone);

  // ── Doublons : déjà présents dans Monkomi ou répétés dans le fichier ──
  const existing = new Set<string>();
  if (reservations.length) {
    const dates = reservations.map((r) => r.date).sort();
    for (let offset = 0; ; offset += 1000) {
      const { data } = await supabase
        .from("reservations")
        .select("date, time, name")
        .eq("restaurant_id", restaurant.id)
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1])
        .range(offset, offset + 999);
      for (const r of data ?? []) existing.add(resKey(r));
      if (!data || data.length < 1000) break;
    }
  }
  const fresh: ResRow[] = [];
  let duplicates = 0;
  for (const r of reservations) {
    const key = resKey(r);
    if (existing.has(key)) duplicates++;
    else {
      existing.add(key);
      fresh.push(r);
    }
  }

  // ── Clients : complétés s'ils existent (même e-mail ou téléphone), sinon créés ──
  const byEmail = new Map<string, { id: string; notes: string | null; tags: string[]; email: string | null; phone: string | null }>();
  const byPhone = new Map<string, { id: string; notes: string | null; tags: string[]; email: string | null; phone: string | null }>();
  if (customers.length) {
    for (let offset = 0; ; offset += 1000) {
      const { data } = await supabase
        .from("customers")
        .select("id, email, phone, phone_key, notes, tags")
        .eq("restaurant_id", restaurant.id)
        .range(offset, offset + 999);
      for (const c of data ?? []) {
        if (c.email) byEmail.set(c.email, c);
        if (c.phone_key) byPhone.set(c.phone_key, c);
      }
      if (!data || data.length < 1000) break;
    }
  }
  const toCreate: CustRow[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];
  const seenInFile = new Set<string>();
  for (const c of customers) {
    const key = phoneKey(c.phone);
    const fileKey = c.email ?? `tel:${key}`;
    if (seenInFile.has(fileKey)) continue;
    seenInFile.add(fileKey);
    const found = (c.email && byEmail.get(c.email)) || (key && byPhone.get(key)) || null;
    if (!found) {
      toCreate.push(c);
      continue;
    }
    const notes = c.notes && !(found.notes ?? "").includes(c.notes) ? [found.notes, c.notes].filter(Boolean).join(" · ") : found.notes;
    toUpdate.push({
      id: found.id,
      patch: {
        notes,
        tags: [...new Set([...found.tags, ...c.tags])].slice(0, 10),
        email: found.email ?? c.email,
        phone: found.phone ?? c.phone,
        phone_key: phoneKey(found.phone ?? c.phone),
      },
    });
  }

  const summary = {
    mode,
    reservations: {
      valid: fresh.length,
      upcoming: fresh.filter((r) => r.date >= today).length,
      past: fresh.filter((r) => r.date < today).length,
      duplicates,
    },
    customers: { created: toCreate.length, updated: toUpdate.length },
    problems: problems.slice(0, 100),
  } satisfies NonNullable<ImportResult>;

  if (mode === "check") return summary;

  // ── Enregistrement ── (clients d'abord : les réservations s'y rattachent par e-mail / téléphone)
  for (let i = 0; i < toCreate.length; i += 500) {
    const { error } = await supabase.from("customers").insert(
      toCreate.slice(i, i + 500).map((c) => ({ ...c, phone_key: phoneKey(c.phone), restaurant_id: restaurant.id })),
    );
    if (error) return { ...summary, error: `Import des clients interrompu : ${error.message}` };
  }
  for (const u of toUpdate) await supabase.from("customers").update(u.patch).eq("id", u.id).eq("restaurant_id", restaurant.id);

  const insertedIds: { id: string; date: string; status: ReservationStatus }[] = [];
  for (let i = 0; i < fresh.length; i += 500) {
    const { data, error } = await supabase
      .from("reservations")
      .insert(fresh.slice(i, i + 500).map((r) => ({ ...r, restaurant_id: restaurant.id, source: "admin" })))
      .select("id, date, status");
    if (error) return { ...summary, error: `Import des réservations interrompu après ${insertedIds.length} lignes : ${error.message}` };
    insertedIds.push(...((data ?? []) as typeof insertedIds));
  }

  // Réservations à venir : placement automatique sur une table libre (dans la limite de MAX_PLACED).
  let placed = 0;
  let unplaced = 0;
  const upcoming = insertedIds.filter((r) => r.date >= today && ["pending", "confirmed"].includes(r.status));
  for (const [i, r] of upcoming.entries()) {
    if (i >= MAX_PLACED) {
      unplaced += upcoming.length - MAX_PLACED;
      break;
    }
    const { data } = await supabase.rpc("auto_assign", { p_reservation: r.id });
    if (data) placed++;
    else unplaced++;
  }

  revalidatePath("/admin", "layout");
  return { ...summary, placed, unplaced };
}
