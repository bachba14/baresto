import type { NextRequest } from "next/server";
import { getMyRestaurant } from "@/lib/data";
import { addDays, isValidDate, STATUS_LABELS, todayIn } from "@/lib/format";
import type { Reservation } from "@/lib/types";

type Row = Reservation & {
  reservation_tables: { dining_tables: { label: string } | null }[];
  customers: { notes: string | null } | null;
};

// Point-virgule + BOM UTF-8 : ouverture directe dans Excel en français.
// Une valeur commençant par =, +, -, @ serait exécutée comme formule par Excel : on la préfixe.
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export CSV des réservations d'une période (?from=AAAA-MM-JJ&to=AAAA-MM-JJ). */
export async function GET(request: NextRequest) {
  const { supabase, restaurant } = await getMyRestaurant();
  if (!restaurant) return new Response("Aucun restaurant.", { status: 403 });

  const today = todayIn(restaurant.timezone);
  const params = request.nextUrl.searchParams;
  const from = isValidDate(params.get("from")) ? params.get("from")! : today;
  let to = isValidDate(params.get("to")) ? params.get("to")! : from;
  if (to < from) to = from;
  if (to > addDays(from, 366)) to = addDays(from, 366);

  const { data, error } = await supabase
    .from("reservations")
    .select("*, reservation_tables(dining_tables(label)), customers(notes)")
    .eq("restaurant_id", restaurant.id)
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("time");
  if (error) return new Response(error.message, { status: 500 });

  const header = ["Date", "Heure", "Couverts", "Nom", "Téléphone", "E-mail", "Statut", "Tables", "Origine", "Remarques", "Notes client", "Créée le"];
  const lines = (data as Row[]).map((r) =>
    [
      r.date,
      r.time.slice(0, 5),
      r.party_size,
      r.name,
      r.phone,
      r.email,
      STATUS_LABELS[r.status],
      r.reservation_tables.map((t) => t.dining_tables?.label).filter(Boolean).join(" + "),
      r.source === "admin" ? "Saisie manuelle" : "En ligne",
      r.notes,
      r.customers?.notes,
      new Date(r.created_at).toLocaleString("fr-FR", { timeZone: restaurant.timezone }),
    ].map(cell).join(";"),
  );

  const name = from === to ? `reservations-${from}.csv` : `reservations-${from}_${to}.csv`;
  return new Response("\uFEFF" + [header.join(";"), ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
