// Filtres anti-spam sur le contenu des formulaires publics (réservation, liste d'attente, inscription).
// Complètent la limitation par adresse IP (rate-limit.ts) et le champ piège « website ».

/** Liens : les robots publicitaires en glissent dans le nom ou les remarques ; un convive n'en a pas besoin. */
export function hasLink(...texts: (string | null | undefined)[]) {
  return texts.some((t) => t && /(https?:\/\/|www\.|\[url|<a\s)/i.test(t));
}

/** Messageries jetables les plus courantes (adresse créée pour l'occasion, personne ne répond). */
const DISPOSABLE = new Set([
  "yopmail.com", "yopmail.fr", "yopmail.net", "mailinator.com", "guerrillamail.com", "guerrillamail.info",
  "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net", "temp-mail.org",
  "temp-mail.io", "tempmail.com", "tempmail.net", "tempail.com", "trashmail.com", "trashmail.de", "trashmail.net",
  "dispostable.com", "getnada.com", "nada.email", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mohmal.com",
  "emailondeck.com", "mintemail.com", "mytemp.email", "jetable.org", "spamgourmet.com", "mailnesia.com",
  "burnermail.io", "1secmail.com", "1secmail.net", "mail.tm", "mailcatch.com", "spambox.us", "tempr.email",
  "discard.email", "moakt.com", "emailfake.com", "crazymailing.com", "tmpmail.org", "tmail.ws",
]);

export function isDisposableEmail(email: string | null | undefined) {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  return Boolean(domain && DISPOSABLE.has(domain));
}

export const LINK_REFUSED = "Les liens ne sont pas acceptés dans ce formulaire.";
export const DISPOSABLE_REFUSED = "Les adresses e-mail jetables ne sont pas acceptées. Utilisez votre adresse habituelle.";
