// Sites autorisés à intégrer les widgets, séparés par des espaces
// (ex. "https://mon-resto.fr https://www.mon-resto.fr"). Par défaut : tous.
const widgetAncestors = process.env.WIDGET_ALLOWED_ORIGINS?.trim() || "*";

/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" }, // upload des photos de la carte
  },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        // En-têtes de sécurité sur tout le site.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // Seuls les widgets peuvent être affichés dans le site d'un autre (anti-clickjacking).
        source: "/:path((?!widget/|embed\\.js|demo\\.html).*)",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self'" }],
      },
      {
        source: "/widget/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${widgetAncestors}` }],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
