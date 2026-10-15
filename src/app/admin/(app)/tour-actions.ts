"use server";

import { requireUser } from "@/lib/data";

/** Retient sur le compte que la visite guidée a été vue (terminée ou passée). */
export async function markTourDone() {
  const { supabase } = await requireUser();
  await supabase.auth.updateUser({ data: { tour_done: true } });
  // Nouveau jeton : les métadonnées lues dans les claims sont à jour dès le prochain chargement.
  await supabase.auth.refreshSession();
}
