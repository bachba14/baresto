"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleOAuthConfig } from "@/lib/google-oauth";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rate-limit";

export type AuthState = { error?: string; info?: string } | null;

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) {
    return {
      error: error.code === "email_not_confirmed"
        ? "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail)."
        : "E-mail ou mot de passe incorrect.",
    };
  }
  redirect("/admin");
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Un compte existe déjà avec cet e-mail. Connectez-vous." };
    if (error.code === "over_email_send_rate_limit") return { error: "Trop d'inscriptions en peu de temps, réessayez dans quelques minutes." };
    return { error: error.message };
  }
  // Sans confirmation d'e-mail requise, la session est ouverte immédiatement.
  if (data.session) redirect("/onboarding");
  return { info: `Presque fini ! Cliquez sur le lien envoyé à ${email} pour activer votre compte.` };
}

/**
 * Connexion / inscription avec Google : redirige vers Google, puis Google renvoie vers
 * /auth/callback. Un nouveau compte arrive dans l'assistant (via /admin → /onboarding).
 */
export async function signInWithGoogle(): Promise<AuthState> {
  // Flux sur notre domaine (Google affiche baresto…) si les identifiants Google sont configurés.
  if (googleOAuthConfig()) redirect("/auth/google?next=/admin");

  // Sinon, flux OAuth géré par Supabase.
  // signInWithOAuth ne vérifie pas que le fournisseur est activé : sans ce contrôle,
  // le visiteur atterrirait sur une erreur JSON brute de Supabase.
  if (!(await isGoogleEnabled())) return { error: "La connexion avec Google n'est pas encore disponible." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteUrl()}/auth/callback?next=/admin`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return { error: "Connexion Google impossible, réessayez." };
  redirect(data.url);
}

async function isGoogleEnabled() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 60 },
    });
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return true; // En cas de doute, on laisse Supabase répondre.
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Mot de passe oublié : envoie un lien de réinitialisation. Réponse identique que le compte existe
 * ou non (on ne révèle pas quelles adresses sont inscrites).
 */
export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  if (rateLimited(`motdepasse:${clientIp(await headers())}`, [[5, 15 * 60_000]])) return { error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/nouveau-mot-de-passe`,
  });
  if (error?.code === "over_email_send_rate_limit") return { error: "Trop de demandes en peu de temps, réessayez dans quelques minutes." };
  return { info: `Si un compte existe pour ${email}, un lien pour choisir un nouveau mot de passe vient d'y être envoyé.` };
}

/** Nouveau mot de passe, après avoir cliqué sur le lien reçu par e-mail (session ouverte par ce lien). */
export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Ce lien a expiré. Demandez un nouveau lien depuis « Mot de passe oublié »." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Choisissez un mot de passe différent de l'ancien." };
    if (error.code === "weak_password") return { error: "Mot de passe trop faible ou déjà apparu dans une fuite de données : choisissez-en un autre." };
    return { error: "Impossible de changer le mot de passe, réessayez." };
  }
  redirect("/admin");
}
