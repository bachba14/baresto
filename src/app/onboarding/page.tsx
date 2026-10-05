import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyRestaurant } from "@/lib/data";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Configuration", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const [{ supabase, restaurant, email }, params] = await Promise.all([getMyRestaurant(), searchParams]);
  if (restaurant?.onboarding_completed) redirect("/admin");

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
