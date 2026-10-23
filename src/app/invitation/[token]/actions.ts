"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { clientIp, rateLimited, TOO_MANY } from "@/lib/rate-limit";

export type JoinState = { error?: string; existing?: boolean } | null;

/** Compte connecté avec la bonne adresse : rejoint le restaurant. */
export async function acceptInvitation(token: string): Promise<JoinState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.code === "P0001" ? error.message : "Impossible de rejoindre l'équipe, réessayez." };
  redirect("/admin");
}

/**
 * Pas encore de compte : création avec l'adresse de l'invitation (déjà prouvée, puisque le lien secret a été
 * reçu sur cette boîte), connexion, puis entrée dans l'équipe.
 */
export async function createAccountAndJoin(token: string, _: JoinState, formData: FormData): Promise<JoinState> {
  if (rateLimited(`invitation-compte:${clientIp(await headers())}`, [[10, 15 * 60_000]])) return { error: TOO_MANY };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const admin = createServiceClient();
  if (!admin) return { error: "Création de compte indisponible pour le moment. Prévenez la personne qui vous a invité." };
  const { data } = await admin.rpc("invitation_info", { p_token: token });
  const invitation = (data as { email: string }[] | null)?.[0];
  if (!invitation) return { error: "Cette invitation n'est plus valable. Demandez-en une nouvelle." };

  const { error: createError } = await admin.auth.admin.createUser({ email: invitation.email, password, email_confirm: true });
  if (createError) {
    if (createError.code === "email_exists" || /already/i.test(createError.message)) {
      return { existing: true, error: "Un compte existe déjà avec cette adresse : connectez-vous pour rejoindre l'équipe." };
    }
    return { error: "Création du compte impossible, réessayez." };
  }

  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
  if (loginError) return { existing: true, error: "Compte créé : connectez-vous pour rejoindre l'équipe." };
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.code === "P0001" ? error.message : "Impossible de rejoindre l'équipe, réessayez." };
  redirect("/admin");
}

/** Connecté avec un autre compte : déconnexion, retour sur l'invitation. */
export async function switchAccount(token: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/invitation/${token}`);
}
