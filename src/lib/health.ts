// Surveillance : chaque composant sensible enregistre ses succès et ses échecs (table system_health), les erreurs
// serveur sont journalisées (app_errors). /api/health en fait un bulletin, consulté par un service externe
// qui alerte en cas de problème, même si le site lui-même est en panne.

import { createServiceClient } from "./supabase/server";

export type Component = "cron" | "email" | "push";

/** Retire les données personnelles d'un message ou d'un chemin : e-mails, liens secrets, paramètres. */
export function scrub(text: string, max = 300) {
  return text
    .replace(/[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}/gi, "[e-mail]")
    .replace(/[a-f0-9]{32,}/gi, "[jeton]")
    .slice(0, max);
}

// Succès : une écriture toutes les 10 minutes au plus par composant (le dernier succès suffit).
const lastOkWrite = new Map<Component, number>();

export async function recordOk(component: Component) {
  const now = Date.now();
  if (now - (lastOkWrite.get(component) ?? 0) < 10 * 60_000) return;
  lastOkWrite.set(component, now);
  const supabase = createServiceClient();
  if (!supabase) return;
  await supabase
    .from("system_health")
    .upsert({ component, last_ok_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }, { onConflict: "component" })
    .then(({ error }) => error && console.error("[health]", error.message));
}

export async function recordError(component: Component, message: string) {
  console.error(`[health:${component}]`, message);
  // Le prochain succès doit être enregistré tout de suite pour lever l'alerte.
  lastOkWrite.delete(component);
  const supabase = createServiceClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from("system_health")
    .upsert({ component, last_error_at: now, last_error: scrub(message), updated_at: now }, { onConflict: "component" })
    .then(({ error }) => error && console.error("[health]", error.message));
}

// Erreurs serveur : 30 par minute au plus par instance, pour qu'une avalanche n'en ajoute pas une autre.
let serverErrors: number[] = [];

export async function recordServerError(info: { path?: string; route?: string; kind?: string; message: string; digest?: string }) {
  const now = Date.now();
  serverErrors = serverErrors.filter((t) => t > now - 60_000);
  if (serverErrors.length >= 30) return;
  serverErrors.push(now);
  const supabase = createServiceClient();
  if (!supabase) return;
  await supabase.from("app_errors").insert({
    path: info.path ? scrub(info.path.split("?")[0], 200) : null,
    route: info.route ?? null,
    kind: info.kind ?? null,
    message: scrub(info.message),
    digest: info.digest ?? null,
  });
}

type HealthRow = { component: Component; last_ok_at: string | null; last_error_at: string | null; last_error: string | null };

const minutesAgo = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 60_000 : Infinity);

/** Bulletin de santé : liste des problèmes en cours (vide si tout va bien). */
export async function healthReport(options: { emailConfigured: boolean; pushConfigured: boolean }) {
  const problems: string[] = [];
  const supabase = createServiceClient();
  if (!supabase) return ["Clé secrète Supabase absente : surveillance impossible."];

  const [{ data: rows, error }, { count: recentErrors }] = await Promise.all([
    supabase.from("system_health").select("component, last_ok_at, last_error_at, last_error"),
    supabase.from("app_errors").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString()),
  ]);
  if (error) return [`Base de données injoignable : ${error.message}`];
  const byComponent = new Map(((rows ?? []) as HealthRow[]).map((r) => [r.component, r]));

  // Tâche programmée : toutes les 15 minutes ; alerte après 40 minutes sans exécution réussie.
  const cron = byComponent.get("cron");
  const cronAge = minutesAgo(cron?.last_ok_at ?? null);
  if (cronAge > 40) {
    problems.push(cron?.last_ok_at
      ? `Tâche programmée : aucune exécution réussie depuis ${Math.round(cronAge)} min${cron.last_error ? ` (${cron.last_error})` : ""}.`
      : "Tâche programmée : aucune exécution réussie enregistrée.");
  }

  // E-mails et notifications : échec récent non suivi d'un succès.
  for (const [component, label, configured] of [
    ["email", "E-mails", options.emailConfigured],
    ["push", "Notifications", options.pushConfigured],
  ] as const) {
    if (!configured) {
      problems.push(`${label} : non configurés sur le serveur.`);
      continue;
    }
    const row = byComponent.get(component);
    if (row?.last_error_at && minutesAgo(row.last_error_at) < 60 && minutesAgo(row.last_error_at) < minutesAgo(row.last_ok_at)) {
      problems.push(`${label} : échec d'envoi il y a ${Math.round(minutesAgo(row.last_error_at))} min (${row.last_error ?? "erreur inconnue"}).`);
    }
  }

  if ((recentErrors ?? 0) >= 5) problems.push(`Serveur : ${recentErrors} erreurs en 15 minutes.`);
  return problems;
}
