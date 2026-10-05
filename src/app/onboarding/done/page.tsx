import Link from "next/link";
import { headers } from "next/headers";
import { requireRestaurant } from "@/lib/data";
import { cardClass } from "@/components/admin-styles";
import { CopyBlock } from "@/app/admin/(app)/integration/copy-block";

export default async function OnboardingDone() {
  const { restaurant } = await requireRestaurant();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;
  const publicUrl = `${base}/r/${restaurant.slug}`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{restaurant.name} est prêt !</h1>
        <p className="mt-2 text-stone-500">Vous pouvez dès maintenant recevoir des réservations.</p>
      </div>

      <section className={`${cardClass} space-y-3 p-6`}>
        <h2 className="font-semibold">1. Votre page de réservation</h2>
        <p className="text-sm text-stone-500">Partagez ce lien sur Google Maps, Instagram, Facebook…</p>
        <CopyBlock code={publicUrl} />
        <a href={`/r/${restaurant.slug}`} target="_blank" className="inline-block text-sm font-medium text-amber-700 hover:underline">
          Ouvrir ma page ↗
        </a>
      </section>

      <section className={`${cardClass} space-y-3 p-6`}>
        <h2 className="font-semibold">2. Sur votre site web (optionnel)</h2>
        <p className="text-sm text-stone-500">Collez ce code là où le formulaire doit apparaître.</p>
        <CopyBlock code={`<div data-baresto="reservation"></div>\n<script src="${base}/embed.js" data-restaurant="${restaurant.slug}" async></script>`} />
      </section>

      <div className="text-center">
        <Link href="/admin" className="inline-block rounded-lg bg-stone-900 px-6 py-3 font-medium text-white hover:bg-stone-700">
          Accéder à mon tableau de bord →
        </Link>
      </div>
    </div>
  );
}
