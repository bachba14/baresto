import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyRestaurant } from "@/lib/data";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Configuration", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const [{ supabase, restaurant, email }, params] = await Promise.all([getMyRestaurant(), searchParams]);
  if (restaurant?.onboarding_completed) redirect("/admin");
  // Invité dans l'équipe d'un restaurant (connexion ou inscription sans passer par le lien) : on l'y conduit
  // plutôt que de lui faire créer un restaurant.
  if (!restaurant) {
    const { data: invitation } = await supabase.rpc("my_pending_invitation");
    if (typeof invitation === "string" && invitation) redirect(`/invitation/${invitation}`);
  }

  // Sans restaurant, on commence forcément par l'étape 1.
  const requested = Number(params.step) || 1;
  const step = restaurant ? Math.min(Math.max(requested, 1), 5) : 1;

  let tableCount = 0;
  if (restaurant) {
    const { count } = await supabase
      .from("dining_tables")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id);
    tableCount = count ?? 0;
  }

  return <Wizard step={step} restaurant={restaurant} tableCount={tableCount} email={email} />;
}
