import ExcelJS from "exceljs";
import { getMyRestaurant } from "@/lib/data";

const AMBER = "FFB45309";
const STATUSES = ["Confirmée", "En attente", "Installée", "Partie", "Annulée", "Non venue"];

function header(sheet: ExcelJS.Worksheet, columns: { header: string; key: string; width: number; note?: string }[]) {
  sheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  const row = sheet.getRow(1);
  row.height = 22;
  row.eachCell((cell, n) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } };
    cell.alignment = { vertical: "middle" };
    const note = columns[n - 1].note;
    if (note) cell.note = note;
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/** Modèle Excel à remplir puis à réimporter (réservations et clients). */
export async function GET() {
  const { restaurant, isAdmin } = await getMyRestaurant();
  if (!restaurant || !isAdmin) return new Response("Réservé aux administrateurs du restaurant.", { status: 403 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Monkomi";

  // ── Mode d'emploi ──
  const help = wb.addWorksheet("Mode d'emploi", { properties: { tabColor: { argb: AMBER } } });
  help.getColumn(1).width = 110;
  const lines: [string, boolean?][] = [
    ["Importer vos réservations et vos clients dans Monkomi", true],
    [""],
    ["1. Remplissez la feuille « Réservations » (une ligne par réservation) et / ou la feuille « Clients »."],
    ["2. Ne modifiez pas la première ligne (les titres des colonnes). Vous pouvez supprimer une feuille inutile."],
    ["3. Enregistrez le fichier, puis importez-le dans Monkomi : menu Importer → « Vérifier le fichier » → « Importer »."],
    [""],
    ["Réservations", true],
    ["• Obligatoire : Date, Heure, Couverts, Nom. Un e-mail ou un téléphone permet de retrouver le client (fiche client automatique)."],
    ["• Date : 15/10/2026 (ou une date Excel). Heure : 20:00, 20h ou 20h30."],
    ["• Statut : Confirmée (par défaut si vide), En attente, Installée, Partie, Annulée ou Non venue."],
    ["• Les réservations passées servent d'historique (statistiques, fidélité des clients). Passées et « Confirmée », elles sont comptées comme venues."],
    ["• Les réservations à venir sont placées automatiquement sur une table libre quand c'est possible."],
    [""],
    ["Clients", true],
    ["• Obligatoire : Nom, et un e-mail ou un téléphone. Étiquettes séparées par des virgules (ex. VIP, sans gluten)."],
    ["• Un client déjà présent (même e-mail ou même téléphone) est complété, pas dupliqué."],
    [""],
    ["Bon à savoir", true],
    ["• Aucun e-mail n'est envoyé à vos clients lors d'un import."],
    ["• Une réservation déjà présente (même date, même heure, même nom) n'est pas importée deux fois : vous pouvez réimporter sans risque."],
    ["• Vous pouvez aussi importer un export d'un autre logiciel (Excel ou CSV) : les colonnes Date, Heure, Couverts / Personnes, Nom, Téléphone, E-mail… sont reconnues."],
    [""],
    ["Exemples de lignes valides", true],
    ["Réservation : 15/10/2026 | 20:00 | 4 | Jeanne Dupont | 0470 12 34 56 | jeanne@exemple.be | Anniversaire | Confirmée"],
    ["Client : Jeanne Dupont | jeanne@exemple.be | 0470 12 34 56 | Allergie aux noix | VIP"],
  ];
  lines.forEach(([t, bold], i) => {
    const cell = help.getCell(i + 1, 1);
    cell.value = t;
    cell.alignment = { wrapText: true };
    if (bold) cell.font = { bold: true, size: i === 0 ? 14 : 12, color: { argb: i === 0 ? AMBER : "FF1C1917" } };
  });

  // ── Réservations ──
  const res = wb.addWorksheet("Réservations");
  header(res, [
    { header: "Date", key: "date", width: 13, note: "Ex. 15/10/2026" },
    { header: "Heure", key: "time", width: 9, note: "Ex. 20:00" },
    { header: "Couverts", key: "party", width: 10 },
    { header: "Nom", key: "name", width: 26 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Remarques", key: "notes", width: 36 },
    { header: "Statut", key: "status", width: 14, note: "Confirmée si vide" },
  ]);
  res.getColumn("date").numFmt = "dd/mm/yyyy";
  res.getColumn("time").numFmt = "hh:mm";
  res.getColumn("phone").numFmt = "@";
  // Liste déroulante des statuts et contrôle des couverts sur 1 000 lignes.
  for (let r = 2; r <= 1000; r++) {
    res.getCell(r, 8).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${STATUSES.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Statut",
      error: `Choisissez : ${STATUSES.join(", ")}`,
    };
    res.getCell(r, 3).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [1, 100],
      showErrorMessage: true,
      error: "Nombre de couverts entre 1 et 100",
    };
  }

  // ── Clients ──
  const clients = wb.addWorksheet("Clients");
  header(clients, [
    { header: "Nom", key: "name", width: 26 },
    { header: "E-mail", key: "email", width: 28 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "Notes", key: "notes", width: 40, note: "Visibles par votre équipe sur chaque réservation" },
    { header: "Étiquettes", key: "tags", width: 24, note: "Séparées par des virgules : VIP, sans gluten…" },
  ]);
  clients.getColumn("phone").numFmt = "@";

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="monkomi-import-${restaurant.slug}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
