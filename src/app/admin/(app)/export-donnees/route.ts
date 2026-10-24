import ExcelJS from "exceljs";
import { getMyRestaurant } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/format";
import type { ReservationStatus } from "@/lib/types";

// Export complet des données du restaurant (droit à la portabilité, avant une suppression).

const AMBER = "FFB45309";
const PAGE = 1000; // nombre de lignes maximum renvoyées par Supabase par requête

type Row = Record<string, unknown>;
type Column = { header: string; key: string; width?: number };

function addSheet(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: Row[]) {
  const sheet = wb.addWorksheet(name);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.addRows(rows);
}

const list = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v);

export async function GET() {
  const { supabase, restaurant, isAdmin } = await getMyRestaurant();
  if (!restaurant || !isAdmin) return new Response("Réservé aux administrateurs du restaurant.", { status: 403 });
  const id = restaurant.id;

  /** Toutes les lignes d'une table du restaurant, page par page. */
  async function all(table: string, select = "*", order = "created_at") {
    const rows: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select(select).eq("restaurant_id", id).order(order).range(from, from + PAGE - 1);
      if (error) throw new Error(`${table} : ${error.message}`);
      rows.push(...((data ?? []) as unknown as Row[]));
      if (!data || data.length < PAGE) return rows;
    }
  }

  const [reservations, customers, waitlist, categories, items, rooms, tables, closures, team, giftCards] = await Promise.all([
    all("reservations", "*, reservation_tables(dining_tables(label))", "date"),
    all("customers"),
    all("waitlist"),
    all("menu_categories", "*", "position"),
    all("menu_items", "*", "position"),
    all("rooms", "*", "position"),
    all("dining_tables", "*", "label"),
    all("closures", "*", "date"),
    supabase.rpc("team_members", { p_restaurant: id }).then(({ data }) => (data ?? []) as Row[]),
    all("gift_cards"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Monkomi";

  addSheet(wb, "Restaurant", [{ header: "Champ", key: "k", width: 28 }, { header: "Valeur", key: "v", width: 60 }],
    Object.entries(restaurant).map(([k, v]) => ({ k, v: typeof v === "object" && v !== null ? JSON.stringify(v) : v })));

  addSheet(wb, "Réservations", [
    { header: "Date", key: "date", width: 12 }, { header: "Heure", key: "time", width: 8 }, { header: "Couverts", key: "party_size", width: 10 },
    { header: "Nom", key: "name", width: 24 }, { header: "Téléphone", key: "phone" }, { header: "E-mail", key: "email", width: 28 },
    { header: "Statut", key: "status", width: 12 }, { header: "Tables", key: "tables", width: 10 }, { header: "Origine", key: "source", width: 14 },
    { header: "Remarques", key: "notes", width: 40 }, { header: "Créée le", key: "created_at", width: 22 },
  ], reservations.map((r) => ({
    ...r,
    time: String(r.time).slice(0, 5),
    status: STATUS_LABELS[r.status as ReservationStatus] ?? r.status,
    source: r.source === "admin" ? "Saisie manuelle" : "En ligne",
    tables: ((r.reservation_tables ?? []) as { dining_tables: { label: string } | null }[]).map((t) => t.dining_tables?.label).filter(Boolean).join(" + "),
  })));

  addSheet(wb, "Clients", [
    { header: "Nom", key: "name", width: 24 }, { header: "E-mail", key: "email", width: 28 }, { header: "Téléphone", key: "phone" },
    { header: "Étiquettes", key: "tags", width: 24 }, { header: "Notes", key: "notes", width: 40 }, { header: "Réservations", key: "reservation_count", width: 12 },
    { header: "Non venues", key: "no_show_count", width: 12 }, { header: "Annulations", key: "cancelled_count", width: 12 },
    { header: "Première visite", key: "first_date", width: 14 }, { header: "Dernière visite", key: "last_date", width: 14 },
  ], customers.map((c) => ({ ...c, tags: list(c.tags) })));

  addSheet(wb, "Liste d'attente", [
    { header: "Date", key: "date", width: 12 }, { header: "Heure", key: "time", width: 8 }, { header: "Couverts", key: "party_size", width: 10 },
    { header: "Nom", key: "name", width: 24 }, { header: "E-mail", key: "email", width: 28 }, { header: "Téléphone", key: "phone" },
    { header: "Statut", key: "status", width: 12 }, { header: "Inscrit le", key: "created_at", width: 22 },
  ], waitlist);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  addSheet(wb, "Carte", [
    { header: "Catégorie", key: "category", width: 20 }, { header: "Plat", key: "name", width: 28 }, { header: "Description", key: "description", width: 50 },
    { header: "Prix", key: "price", width: 10 }, { header: "Étiquettes", key: "tags", width: 20 }, { header: "Allergènes", key: "allergens", width: 24 },
    { header: "Disponible", key: "is_available", width: 10 }, { header: "Photo", key: "image_url", width: 40 },
  ], items.map((i) => ({ ...i, category: categoryName.get(i.category_id), tags: list(i.tags), allergens: list(i.allergens), is_available: i.is_available ? "oui" : "non" })));

  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  addSheet(wb, "Plan de salle", [
    { header: "Salle", key: "room", width: 18 }, { header: "Table", key: "label", width: 10 }, { header: "Places", key: "seats", width: 8 },
    { header: "Places minimum", key: "min_seats", width: 14 }, { header: "Forme", key: "shape", width: 10 },
    { header: "Groupe combinable", key: "combine_group", width: 18 }, { header: "Réservable en ligne", key: "bookable_online", width: 18 },
  ], tables.map((t) => ({ ...t, room: roomName.get(t.room_id), bookable_online: t.bookable_online ? "oui" : "non" })));

  addSheet(wb, "Fermetures", [
    { header: "Date", key: "date", width: 12 }, { header: "De", key: "start_time", width: 8 }, { header: "À", key: "end_time", width: 8 },
    { header: "Motif", key: "reason", width: 30 },
  ], closures);

  addSheet(wb, "Bons cadeaux", [
    { header: "Montant", key: "amount", width: 10 }, { header: "Pour", key: "recipient_name", width: 20 },
    { header: "De la part de", key: "offered_by", width: 20 }, { header: "Message", key: "message", width: 30 },
    { header: "Envoyé à", key: "send_email", width: 28 }, { header: "Valable jusqu'au", key: "expires_at", width: 14 },
    { header: "Utilisé le", key: "used_at", width: 22 }, { header: "Créé le", key: "created_at", width: 22 },
  ], giftCards.map((g) => ({ ...g, amount: Number(g.amount) })));

  addSheet(wb, "Équipe", [
    { header: "E-mail", key: "email", width: 30 }, { header: "Rôle", key: "role", width: 16 }, { header: "Membre depuis", key: "created_at", width: 22 },
  ], team.map((m) => ({ ...m, role: m.role === "owner" ? "Administrateur" : "Employé" })));

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="monkomi-${restaurant.slug}-donnees.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
