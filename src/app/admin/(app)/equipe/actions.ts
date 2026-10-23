"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/data";
import { emailEnabled } from "@/lib/email";
import { emailInvitation } from "@/lib/notifications";
import { rateLimited } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

export type Role = "owner" | "staff";
export type InviteState = { ok?: string; error?: string; link?: string } | null;

const done = () => revalidatePath("/admin/equipe");

/** Invite une personne par e-mail ; une nouvelle invitation remplace celle en cours pour la même adresse. */
export async function inviteMember(_: InviteState, formData: FormData): Promise<InviteState> {
  const { supabase, restaurant, userId, email: me } = await requireAdminAction();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role: Role = formData.get("role") === "owner" ? "owner" : "staff";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return { error: "Adresse e-mail invalide." };
  if (rateLimited(`invitation:${restaurant.id}`, [[20, 60 * 60_000]])) return { error: "Trop d'invitations en peu de temps, réessayez plus tard." };

  const { data: members } = await supabase.rpc("team_members", { p_restaurant: restaurant.id });
  if (((members ?? []) as { email: string }[]).some((m) => m.email?.toLowerCase() === email)) {
    return { error: "Cette personne fait déjà partie de l'équipe." };
  }

  await supabase.from("restaurant_invitations").delete().eq("restaurant_id", restaurant.id).eq("email", email).is("accepted_at", null);
  const { data, error } = await supabase
    .from("restaurant_invitations")
    .insert({ restaurant_id: restaurant.id, email, role, invited_by: userId })
    .select("token")
    .single();
  if (error || !data) return { error: "Invitation impossible, réessayez." };

  const link = `${await siteUrl()}/invitation/${data.token}`;
  const sent = emailEnabled() && (await emailInvitation(email, role, link, restaurant, me));
  done();
  return sent
    ? { ok: `Invitation envoyée à ${email}.` }
    : { ok: `Invitation créée, mais l'e-mail n'a pas pu partir. Envoyez ce lien à ${email} :`, link };
}

export async function cancelInvitation(id: string) {
  const { supabase, restaurant } = await requireAdminAction();
  await supabase.from("restaurant_invitations").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  done();
}

/** Change le rôle d'un membre. Erreur lisible si c'est le dernier administrateur. */
export async function changeRole(memberId: string, role: Role): Promise<string | null> {
  const { supabase, restaurant, userId } = await requireAdminAction();
  const { error } = await supabase.rpc("set_member_role", { p_restaurant: restaurant.id, p_user: memberId, p_role: role });
  if (error) return error.code === "P0001" ? error.message : "Modification impossible, réessayez.";
  // S'être retiré soi-même les droits d'administrateur : la page Équipe n'est plus accessible.
  if (memberId === userId && role !== "owner") redirect("/admin");
  done();
  return null;
}

export async function removeMember(memberId: string): Promise<string | null> {
  const { supabase, restaurant, userId } = await requireAdminAction();
  const { error } = await supabase.rpc("remove_member", { p_restaurant: restaurant.id, p_user: memberId });
  if (error) return error.code === "P0001" ? error.message : "Retrait impossible, réessayez.";
  if (memberId === userId) redirect("/admin");
  done();
  return null;
}
