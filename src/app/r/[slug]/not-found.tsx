import Link from "next/link";

export default function RestaurantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-stone-50 px-4 text-center">
      <p className="text-5xl">🍽️</p>
      <h1 className="text-2xl font-bold">Restaurant introuvable</h1>
      <p className="text-stone-500">Cette adresse ne correspond à aucun restaurant.</p>
      <Link href="/" className="text-amber-700 hover:underline">Retour à l&apos;accueil</Link>
    </main>
  );
}
