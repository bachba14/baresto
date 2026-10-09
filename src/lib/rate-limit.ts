// Limitation du nombre de requêtes par adresse IP (anti-spam), en mémoire du serveur.
// Suffisant pour une seule instance Node (Hostinger) ; les règles en base (une réservation
// par personne et par jour, 5 à venir au maximum) complètent cette protection.

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

/** Adresse IP du visiteur derrière le proxy de l'hébergeur. */
export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "inconnue"
  );
}

/**
 * Enregistre une requête et indique si elle dépasse une des limites.
 * Ex. rateLimited("resa:1.2.3.4", [[5, 10 * 60_000], [20, 86_400_000]]) : 5 par 10 min et 20 par jour.
 */
export function rateLimited(key: string, limits: [max: number, windowMs: number][]) {
  const now = Date.now();
  const longest = Math.max(...limits.map(([, w]) => w));

  // Ménage régulier pour que la mémoire ne grossisse pas.
  if (now - lastSweep > 10 * 60_000 || hits.size > 50_000) {
    lastSweep = now;
    for (const [k, times] of hits) if (times[times.length - 1] < now - 86_400_000) hits.delete(k);
  }

  const times = (hits.get(key) ?? []).filter((t) => t > now - longest);
  const blocked = limits.some(([max, w]) => times.filter((t) => t > now - w).length >= max);
  if (!blocked) times.push(now);
  hits.set(key, times);
  return blocked;
}

export const TOO_MANY = "Trop de tentatives depuis votre connexion. Réessayez dans quelques minutes ou appelez le restaurant.";
