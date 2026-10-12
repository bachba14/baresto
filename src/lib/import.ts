import ExcelJS from "exceljs";
import type { ReservationStatus } from "./types";

// ─────────────────────────────────────────────────────────────
// Lecture d'un fichier Excel (.xlsx) ou CSV en lignes « en-tête → valeur »
// ─────────────────────────────────────────────────────────────

export type RawRow = { line: number; values: Record<string, unknown> };
export type Sheets = { reservations: RawRow[]; customers: RawRow[] };

/** « Téléphone », « telephone », « TÉL. » → « telephone » / « tel » : comparaison sans accents ni ponctuation. */
const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Noms de colonnes reconnus (modèle Monkomi, export CSV de Monkomi, exports courants d'autres outils).
const COLUMNS: Record<string, string[]> = {
  date: ["date", "jour", "datedereservation", "reservationdate", "day"],
  time: ["heure", "horaire", "time", "heurearrivee", "hour"],
  party: ["couverts", "personnes", "nbpersonnes", "nombredepersonnes", "pax", "covers", "guests", "partysize", "nb"],
  name: ["nom", "client", "nomduclient", "name", "guest", "guestname", "nomcomplet"],
  firstName: ["prenom", "firstname"],
  phone: ["telephone", "tel", "phone", "mobile", "portable", "gsm", "numero"],
  email: ["email", "mail", "adresseemail", "courriel"],
  notes: ["remarques", "remarque", "commentaire", "commentaires", "notes", "note", "comment", "comments", "demandes"],
  status: ["statut", "status", "etat"],
  tags: ["etiquettes", "etiquette", "tags", "tag"],
};

function columnOf(header: unknown): string | null {
  const h = norm(header);
  if (!h) return null;
  for (const [key, names] of Object.entries(COLUMNS)) if (names.includes(h)) return key;
  return null;
}

/** Valeur lisible d'une cellule Excel (texte riche, formule, lien…). */
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return cellValue(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
    return null;
  }
  return v;
}

function rowsFromMatrix(matrix: unknown[][]): RawRow[] {
  // Ligne d'en-tête : la première où au moins deux colonnes sont reconnues.
  const headerIndex = matrix.findIndex((r) => r.filter((c) => columnOf(c)).length >= 2);
  if (headerIndex < 0) return [];
  const keys = matrix[headerIndex].map(columnOf);
  const rows: RawRow[] = [];
  matrix.slice(headerIndex + 1).forEach((r, i) => {
    const values: Record<string, unknown> = {};
    keys.forEach((k, c) => {
      if (k && r[c] != null && String(r[c]).trim() !== "") values[k] = r[c];
    });
    // Numéro de ligne tel qu'affiché dans Excel (1 = première ligne).
    if (Object.keys(values).length) rows.push({ line: headerIndex + i + 2, values });
  });
  return rows;
}

/** CSV : séparateur « ; » ou « , » détecté, guillemets gérés, BOM ignoré. */
function parseCsv(text: string): unknown[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Lit le fichier envoyé. Dans un classeur, la feuille « Clients » (ou toute feuille sans colonne de date)
 * contient des clients ; les autres, des réservations.
 */
export async function readImportFile(file: File): Promise<Sheets> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const out: Sheets = { reservations: [], customers: [] };

  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    const rows = rowsFromMatrix(parseCsv(buffer.toString("utf8")));
    const isReservations = rows.some((r) => "date" in r.values);
    out[isReservations ? "reservations" : "customers"] = rows;
    return out;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  for (const sheet of workbook.worksheets) {
    if (norm(sheet.name).startsWith("modedemploi")) continue;
    const matrix: unknown[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, n) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellValue);
      matrix[n - 1] = values;
    });
    for (let i = 0; i < matrix.length; i++) matrix[i] ??= [];
    const rows = rowsFromMatrix(matrix);
    const isCustomers = norm(sheet.name).startsWith("client") || !rows.some((r) => "date" in r.values);
    out[isCustomers ? "customers" : "reservations"].push(...rows);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Normalisation des valeurs
// ─────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

/** Date Excel, « 15/10/2026 », « 15-10-26 », « 15.10.2026 », « 2026-10-15 » → « 2026-10-15 ». */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Numéro de série Excel (jours depuis le 30/12/1899).
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return parseDate(d);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return valid(year, +m[2], +m[1]);
  }
  return null;
}

function valid(y: number, mo: number, d: number) {
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  if (y < 2000 || y > 2100) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Heure Excel, « 20:00 », « 20h », « 20h30 », « 20.30 », 0,8333 → « 20:00 ». */
export function parseTime(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === "number" && v >= 0 && v < 1) {
    const minutes = Math.round(v * 24 * 60);
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }
  const m = String(v ?? "").trim().toLowerCase().match(/^(\d{1,2})\s*(?:[:h.]\s*(\d{2})?)?/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2] ?? 0);
  if (h > 23 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}

const STATUS_WORDS: [ReservationStatus, string[]][] = [
  ["cancelled", ["annulee", "annule", "cancelled", "canceled", "annulation"]],
  ["no_show", ["nonvenue", "nonvenu", "noshow", "absent", "absente"]],
  ["seated", ["installee", "installe", "seated", "atable"]],
  ["finished", ["partie", "parti", "finished", "terminee", "termine"]],
  ["pending", ["enattente", "attente", "pending", "aconfirmer"]],
  ["confirmed", ["confirmee", "confirme", "confirmed", "ok", "honoree", "honore", "venue", "venu"]],
];

/** Statut lisible → statut Monkomi (confirmée par défaut). */
export function parseStatus(v: unknown): ReservationStatus | null {
  const s = norm(v);
  if (!s) return "confirmed";
  for (const [status, words] of STATUS_WORDS) if (words.includes(s)) return status;
  return null;
}

export const text = (v: unknown, max: number) => {
  const s = v instanceof Date ? "" : String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/** Même clé que phone_key() en SQL : les 9 derniers chiffres. */
export function phoneKey(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-9) : null;
}

export const isEmail = (s: string | null) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

/** Nom complet : « Nom » seul, ou « Prénom » + « Nom » si le fichier les sépare. */
export function fullName(values: Record<string, unknown>) {
  return text([text(values.firstName, 60), text(values.name, 120)].filter(Boolean).join(" "), 120);
}
