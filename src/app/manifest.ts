import type { MetadataRoute } from "next";

/** Application installable (écran d'accueil du téléphone) : elle s'ouvre directement sur le back-office. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monkomi",
    short_name: "Monkomi",
    description: "Réservations et service de votre restaurant.",
    id: "/admin",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf9f7",
    theme_color: "#faf9f7",
    lang: "fr",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
