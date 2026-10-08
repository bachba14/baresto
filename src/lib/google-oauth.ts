import { createHash, randomBytes } from "node:crypto";

// Connexion Google « sur notre domaine » : Google renvoie vers baresto.bachba.be (et non vers
// Supabase), si bien que l'écran de Google affiche notre domaine. La session Supabase est ensuite
// ouverte avec l'ID token Google (signInWithIdToken).
//
// Actif seulement si GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont définis ; sinon on garde le
// flux OAuth géré par Supabase.

export const GOOGLE_COOKIE = "baresto_google_oauth";

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function siteOrigin(fallback: string) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? fallback;
}

export const randomToken = () => randomBytes(32).toString("base64url");

/** Google reçoit l'empreinte du nonce ; Supabase reçoit le nonce brut et compare. */
export const hashNonce = (nonce: string) => createHash("sha256").update(nonce).digest("hex");

/** Chemin interne sûr pour la redirection finale (pas d'URL externe). */
export function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}
