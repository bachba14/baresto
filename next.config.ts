import type { NextConfig } from "next";

// Sites autorisés à intégrer les widgets, séparés par des espaces
// (ex. "https://mon-resto.fr https://www.mon-resto.fr"). Par défaut : tous.
const widgetAncestors = process.env.WIDGET_ALLOWED_ORIGINS?.trim() || "*";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" }, // upload des photos de la carte
  },
  images: { unoptimized: true },
  async headers() {
    return [
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
