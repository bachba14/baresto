import type { createServiceClient } from "./supabase/server";

type Service = NonNullable<ReturnType<typeof createServiceClient>>;

/**
 * Suppression définitive des restaurants dont la suppression a été demandée il y a plus de 30 jours :
 * photos de la carte, restaurant (toutes ses données suivent par cascade), puis comptes des membres
 * qui ne font partie d'aucun autre restaurant. Appelée par la tâche programmée (/api/cron).
 */
export async function purgeDeletedRestaurants(supabase: Service) {
  const limit = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: due, error } = await supabase.from("restaurants").select("id").lt("deletion_requested_at", limit).limit(5);
  if (error) throw new Error(error.message);

  let purged = 0;
  for (const { id } of due ?? []) {
    const { data: members } = await supabase.from("restaurant_members").select("user_id").eq("restaurant_id", id);

    // Photos de la carte : dossier du restaurant dans le stockage (vidé par paquets de 100).
    for (;;) {
      const { data: files } = await supabase.storage.from("menu").list(id, { limit: 100 });
      if (!files?.length) break;
      const { error: removeError } = await supabase.storage.from("menu").remove(files.map((f) => `${id}/${f.name}`));
      if (removeError) break;
    }

    const { error: deleteError } = await supabase.from("restaurants").delete().eq("id", id);
    if (deleteError) {
      console.error("[purge]", id, deleteError.message);
      continue;
    }

    for (const { user_id } of members ?? []) {
      const { count } = await supabase.from("restaurant_members").select("*", { count: "exact", head: true }).eq("user_id", user_id);
      if (!count) await supabase.auth.admin.deleteUser(user_id);
    }
    purged++;
  }
  return purged;
}
