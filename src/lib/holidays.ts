import { addDays } from "./format";

export type Country = "BE" | "FR";
export type Holiday = { date: string; name: string };

/** Dimanche de Pâques (algorithme grégorien anonyme), au format AAAA-MM-JJ. */
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function holidaysOf(year: number, country: Country): Holiday[] {
  const e = easter(year);
  const d = (md: string) => `${year}-${md}`;
  const common: Holiday[] = [
    { date: d("01-01"), name: "Jour de l'An" },
    { date: addDays(e, 1), name: "Lundi de Pâques" },
    { date: d("05-01"), name: "Fête du Travail" },
    { date: addDays(e, 39), name: "Ascension" },
    { date: addDays(e, 50), name: "Lundi de Pentecôte" },
    { date: d("08-15"), name: "Assomption" },
    { date: d("11-01"), name: "Toussaint" },
    { date: d("11-11"), name: "Armistice" },
    { date: d("12-24"), name: "Réveillon de Noël" },
    { date: d("12-25"), name: "Noël" },
    { date: d("12-31"), name: "Saint-Sylvestre" },
  ];
  const national: Holiday[] =
    country === "BE"
      ? [{ date: d("07-21"), name: "Fête nationale belge" }]
      : [
          { date: d("05-08"), name: "Victoire 1945" },
          { date: d("07-14"), name: "Fête nationale" },
        ];
  return [...common, ...national];
}

/** Jours fériés (et réveillons) des 12 prochains mois, à partir de `from`. */
export function upcomingHolidays(from: string, country: Country): Holiday[] {
  const year = Number(from.slice(0, 4));
  const until = addDays(from, 365);
  return [...holidaysOf(year, country), ...holidaysOf(year + 1, country)]
    .filter((h) => h.date >= from && h.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Pays du restaurant, déduit de ses coordonnées : pays écrit dans l'adresse, indicatif téléphonique,
 * code postal (4 chiffres en Belgique, 5 en France), puis fuseau horaire. France par défaut.
 */
export function countryOf(r: { address: string | null; city: string | null; phone: string | null; timezone: string }): Country {
  const place = `${r.address ?? ""} ${r.city ?? ""}`.toLowerCase();
  if (/belgi(que|um|ë)/.test(place)) return "BE";
  if (/\bfrance\b/.test(place)) return "FR";
  const phone = (r.phone ?? "").replace(/[\s.\-()]/g, "");
  if (/^(\+32|0032)/.test(phone)) return "BE";
  if (/^(\+33|0033)/.test(phone)) return "FR";
  if (/(^|\D)\d{4}(\D|$)/.test(place) && !/(^|\D)\d{5}(\D|$)/.test(place)) return "BE";
  if (/(^|\D)\d{5}(\D|$)/.test(place)) return "FR";
  // Numéro national : mobiles belges en 04xx (10 chiffres), français en 06 / 07.
  if (/^04\d{8}$/.test(phone)) return "BE";
  if (/^0[67]\d{8}$/.test(phone)) return "FR";
  return r.timezone === "Europe/Brussels" ? "BE" : "FR";
}

/** Cookie qui mémorise le pays choisi pour la liste des jours fériés. */
export const HOLIDAY_COUNTRY_COOKIE = "monkomi_pays_feries";
