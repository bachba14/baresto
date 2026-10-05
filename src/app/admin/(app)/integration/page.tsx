import { headers } from "next/headers";
import { requireRestaurant } from "@/lib/data";
import { cardClass } from "@/components/admin-styles";
import { CopyBlock } from "./copy-block";

async function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function IntegrationPage() {
  const { restaurant } = await requireRestaurant();
  const base = await baseUrl();
  const script = `<script src="${base}/embed.js" data-restaurant="${restaurant.slug}" async></script>`;
  const widget = `${base}/widget/${restaurant.slug}`;
  const api = `${base}/api/r/${restaurant.slug}`;

  const snippets = [
    {
      title: "Votre page de réservation (sans site web)",
      text: "Un lien à mettre sur Google Maps, Instagram, Facebook ou dans vos e-mails.",
      code: `${base}/r/${restaurant.slug}`,
    },
    {
      title: "Formulaire de réservation",
      text: "Collez ce code à l'endroit où le formulaire doit apparaître (page Contact, Réserver…).",
      code: `<div data-baresto="reservation"></div>\n${script}`,
    },
    {
      title: "Carte du restaurant",
      text: "Affiche votre carte, toujours à jour avec le back-office.",
      code: `<div data-baresto="menu"></div>\n${script}`,
    },
    {
      title: "Bouton « Réserver » (fenêtre)",
      text: "N'importe quel bouton ou lien de votre site peut ouvrir la réservation en fenêtre.",
      code: `<button data-baresto-open="reservation">Réserver une table</button>\n${script}`,
    },
    {
      title: "Options d'apparence",
      text: "Thème sombre et couleur personnalisée, par widget. Sans option, la couleur des réglages est utilisée.",
      code: `<div data-baresto="menu" data-theme="dark" data-color="#0f766e"></div>`,
    },
    {
      title: "Iframe simple (WordPress, Wix, Squarespace…)",
      text: "Si votre éditeur n'accepte pas les scripts, utilisez une iframe classique.",
      code: `<iframe src="${widget}/reservation" style="width:100%;height:720px;border:0" title="Réserver une table"></iframe>`,
    },
    {
      title: "Suivi des réservations (Google Analytics, pixel…)",
      text: "Un événement est déclenché sur votre page à chaque réservation envoyée.",
      code: `<script>\n  window.addEventListener("baresto:reservation", function (e) {\n    // e.detail = { date, time, partySize, status }\n    console.log("Réservation", e.detail);\n  });\n</script>`,
    },
    {
      title: "API JSON (développeurs)",
      text: "Pour une intégration 100 % sur mesure. CORS ouvert.",
      code: `GET  ${api}/menu\nGET  ${api}/availability?date=2026-10-15&party=2\nPOST ${api}/reservations\n     { "date": "2026-10-15", "time": "20:00", "party_size": 2,\n       "name": "Jeanne", "email": "jeanne@exemple.fr", "phone": "", "notes": "" }`,
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intégration à votre site</h1>
        <p className="text-stone-500">
          Copiez un code dans votre site. Les widgets s&apos;adaptent à la hauteur du contenu et au mobile.{" "}
          <a href="/demo.html" target="_blank" className="underline">Voir une page de démo ↗</a>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snippets.map((s) => (
          <section key={s.title} className={`${cardClass} space-y-2`}>
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-sm text-stone-500">{s.text}</p>
            <CopyBlock code={s.code} />
          </section>
        ))}
      </div>

      <section className={cardClass}>
        <h2 className="mb-3 font-semibold">Aperçu</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <iframe src={`/widget/${restaurant.slug}/reservation`} title="Aperçu réservation" className="h-[640px] w-full rounded-lg border border-stone-200" />
          <iframe src={`/widget/${restaurant.slug}/menu`} title="Aperçu carte" className="h-[640px] w-full rounded-lg border border-stone-200" />
        </div>
      </section>
    </div>
  );
}
