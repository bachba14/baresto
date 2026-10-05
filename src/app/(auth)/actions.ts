"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
