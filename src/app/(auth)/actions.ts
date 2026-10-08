"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleOAuthConfig } from "@/lib/google-oauth";

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
