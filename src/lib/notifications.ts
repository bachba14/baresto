import { calendarLinks } from "./calendar";
import { sendEmail } from "./email";
import { formatDate, formatTime } from "./format";
import type { Reservation, Restaurant, WaitlistEntry } from "./types";

type R = Pick<Reservation, "date" | "time" | "party_size" | "name" | "email" | "phone" | "notes" | "token" | "status">;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const people = (n: number) => `${n} ${n > 1 ? "personnes" : "personne"}`;

/** Limite de modification / annulation en ligne (délai réglé par le restaurant, 24 h par défaut). */
export function deadlineText(r: Pick<Reservation, "date" | "time">, hours: number) {
  const [y, m, d] = r.date.split("-").map(Number);
  const [h, mi] = r.time.split(":").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d, h, mi) - hours * 3_600_000);
  const date = at.toISOString().slice(0, 10);
  const time = at.toISOString().slice(11, 16);
  return `${formatDate(date)} à ${formatTime(time)}`;
}

function layout(restaurant: Restaurant, body: string, button?: { href: string; label: string }) {
  const color = /^#[0-9a-f]{6}$/i.test(restaurant.primary_color) ? restaurant.primary_color : "#b45309";
  const contact = [
    restaurant.address && esc([restaurant.address, restaurant.city].filter(Boolean).join(", ")),
    restaurant.phone && esc(restaurant.phone),
  ].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#292524">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${color};color:#fff;padding:20px 24px;font-size:20px;font-weight:bold">${esc(restaurant.name)}</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${body}
${button ? `<p style="margin:24px 0 8px"><a href="${esc(button.href)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(button.label)}</a></p>` : ""}
</td></tr>
${contact ? `<tr><td style="padding:16px 24px;border-top:1px solid #e7e5e4;font-size:13px;color:#78716c">${contact}</td></tr>` : ""}
</table>
<p style="font-size:11px;color:#a8a29e;margin-top:12px">Réservation gérée avec Baresto</p>
</td></tr></table></body></html>`;
}

function summary(r: R) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafaf9;border-radius:8px;padding:12px 16px;width:100%">
<tr><td style="padding:12px 16px"><strong style="font-size:17px;text-transform:capitalize">${esc(formatDate(r.date))}</strong><br>
${esc(formatTime(r.time))} · ${people(r.party_size)} · au nom de ${esc(r.name)}
${r.notes ? `<br><span style="color:#78716c">« ${esc(r.notes)} »</span>` : ""}</td></tr></table>`;
}

function manageLinks(r: R, restaurant: Restaurant, base: string) {
  const cal = calendarLinks(r, restaurant, base);
  const link = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border:1px solid #d6d3d1;border-radius:6px;color:#44403c;text-decoration:none;font-size:13px">${label}</a>`;
  return `<p style="font-size:14px;color:#57534e">Un empêchement ? Vous pouvez modifier ou annuler votre réservation en ligne jusqu'au
${esc(deadlineText(r, restaurant.cancel_deadline_hours))}. Au-delà, merci d'appeler le restaurant.</p>
<p style="font-size:13px;color:#78716c;margin:16px 0 6px">Ajouter à mon agenda :</p>
<p style="margin:0">${link(cal.google, "Google Agenda")}${link(cal.outlook, "Outlook")}${link(cal.apple, "Apple Calendar (iPhone, Mac)")}</p>`;
}

export type ClientEmailKind = "received" | "confirmed" | "modified" | "cancelled" | "refused" | "reminder";

const SUBJECTS: Record<ClientEmailKind, (r: R) => string> = {
  received: () => "Demande de réservation reçue",
  confirmed: (r) => `Réservation confirmée — ${formatDate(r.date)} à ${formatTime(r.time)}`,
  modified: (r) => `Réservation modifiée — ${formatDate(r.date)} à ${formatTime(r.time)}`,
  cancelled: () => "Votre réservation est annulée",
  refused: () => "Votre réservation n'a pas pu être acceptée",
  reminder: (r) => `Rappel : votre table le ${formatDate(r.date)} à ${formatTime(r.time)}`,
};

/** E-mail au client à chaque étape de sa réservation. */
export async function emailClient(kind: ClientEmailKind, r: R, restaurant: Restaurant, base: string) {
  if (!r.email) return false;
  const manage = { href: `${base}/reservation/${r.token}`, label: "Voir ou modifier ma réservation" };
  const hello = `<p>Bonjour ${esc(r.name)},</p>`;
  let body: string;
  let button: { href: string; label: string } | undefined = manage;

  switch (kind) {
    case "received":
      body = `${hello}<p>Nous avons bien reçu votre demande. Le restaurant va la confirmer rapidement : vous recevrez un e-mail.</p>${summary(r)}${manageLinks(r, restaurant, base)}`;
      break;
    case "confirmed":
      body = `${hello}<p>Votre réservation est <strong>confirmée</strong>. À bientôt !</p>${summary(r)}${manageLinks(r, restaurant, base)}`;
      break;
    case "modified":
      body = `${hello}<p>Votre réservation a bien été modifiée${r.status === "pending" ? " ; le restaurant va confirmer ce nouveau créneau" : ""}.</p>${summary(r)}${manageLinks(r, restaurant, base)}`;
      break;
    case "reminder":
      body = `${hello}<p>Petit rappel : nous vous attendons bientôt.</p>${summary(r)}${manageLinks(r, restaurant, base)}`;
      break;
    case "cancelled":
      body = `${hello}<p>Votre réservation est annulée.</p>${summary(r)}<p>Au plaisir de vous accueillir une prochaine fois.</p>`;
      button = { href: `${base}/r/${restaurant.slug}`, label: "Réserver une autre date" };
      break;
    case "refused":
      body = `${hello}<p>Nous sommes désolés : le restaurant n'a pas pu accepter votre demande de réservation.</p>${summary(r)}${restaurant.phone ? `<p>N'hésitez pas à appeler le ${esc(restaurant.phone)} pour trouver une autre solution.</p>` : ""}`;
      button = { href: `${base}/r/${restaurant.slug}`, label: "Choisir un autre créneau" };
      break;
  }

  return sendEmail({
    to: r.email,
    toName: r.name,
    fromName: restaurant.name,
    replyTo: restaurant.email,
    subject: SUBJECTS[kind](r),
    html: layout(restaurant, body, button),
  });
}

/** Alerte au restaurateur (adresse e-mail des réglages). */
export async function emailRestaurant(kind: "new" | "modified" | "cancelled", r: R, restaurant: Restaurant, base: string) {
  if (!restaurant.email) return false;
  const titles = {
    new: r.status === "pending" ? "Nouvelle demande à confirmer" : "Nouvelle réservation",
    modified: "Réservation modifiée par le client",
    cancelled: "Réservation annulée par le client",
  };
  const contact = [r.phone, r.email].filter(Boolean).map((v) => esc(v!)).join(" · ");
  const body = `<p><strong>${titles[kind]}</strong></p>${summary(r)}${contact ? `<p>Contact : ${contact}</p>` : ""}`;
  return sendEmail({
    to: restaurant.email,
    fromName: "Baresto",
    replyTo: r.email,
    subject: `${titles[kind]} : ${r.name}, ${people(r.party_size)}, ${formatDate(r.date)} ${formatTime(r.time)}`,
    html: layout(restaurant, body, { href: `${base}/admin/reservations?date=${r.date}`, label: "Ouvrir le back-office" }),
  });
}

/** Le lendemain du repas : demande d'avis. */
export async function emailReview(r: R, restaurant: Restaurant) {
  if (!r.email || !restaurant.review_url) return false;
  const body = `<p>Bonjour ${esc(r.name)},</p>
<p>Merci d'être venu(e) chez ${esc(restaurant.name)} ! Nous espérons que vous avez passé un bon moment.</p>
<p>Votre avis compte beaucoup pour nous et aide d'autres gourmands à nous découvrir. Cela ne prend qu'une minute.</p>`;
  return sendEmail({
    to: r.email,
    toName: r.name,
    fromName: restaurant.name,
    replyTo: restaurant.email,
    subject: `Merci de votre visite chez ${restaurant.name}`,
    html: layout(restaurant, body, { href: restaurant.review_url, label: "Laisser un avis" }),
  });
}

/** Une table s'est libérée pour une personne en liste d'attente. */
export async function emailWaitlist(entry: WaitlistEntry, times: string[], restaurant: Restaurant, base: string) {
  const link = `${base}/r/${restaurant.slug}?date=${entry.date}&party=${entry.party_size}#reserver`;
  const body = `<p>Bonjour ${esc(entry.name)},</p>
<p>Bonne nouvelle : une table pour ${people(entry.party_size)} s'est libérée le <strong>${esc(formatDate(entry.date))}</strong>
(${times.slice(0, 6).map(formatTime).join(", ")}).</p>
<p>Premier arrivé, premier servi : réservez vite !</p>`;
  return sendEmail({
    to: entry.email,
    toName: entry.name,
    fromName: restaurant.name,
    replyTo: restaurant.email,
    subject: `Une table s'est libérée le ${formatDate(entry.date)}`,
    html: layout(restaurant, body, { href: link, label: "Réserver maintenant" }),
  });
}
