"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Icônes au trait (24 × 24), dans le style du reste de l'interface. */
const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  service: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14.8c1.7.8 2.8 2.6 3 5.2" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  menu: (
    <>
      <path d="M5 3.5h11.5a2 2 0 0 1 2 2V20.5H7a2 2 0 0 1-2-2z" />
      <path d="M5 18.5a2 2 0 0 1 2-2h11.5M9 8h6M9 11.5h4" />
    </>
  ),
  floor: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <circle cx="9" cy="9" r="1.8" />
      <circle cx="15" cy="15" r="1.8" />
      <path d="M14 7.5h3M7.5 15v2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
};

export function Icon({ name, className = "h-[18px] w-[18px]" }: { name: keyof typeof ICONS | "external" | "logout"; className?: string }) {
  const extra: Record<string, ReactNode> = {
    external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
    logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {ICONS[name] ?? extra[name]}
    </svg>
  );
}

const GROUPS: { title?: string; links: { href: string; label: string; icon: keyof typeof ICONS }[] }[] = [
  {
    links: [
      { href: "/admin", label: "Tableau de bord", icon: "home" },
      { href: "/admin/service", label: "Service", icon: "service" },
      { href: "/admin/reservations", label: "Réservations", icon: "calendar" },
    ],
  },
  {
    title: "Suivi",
    links: [
      { href: "/admin/clients", label: "Clients", icon: "users" },
      { href: "/admin/stats", label: "Statistiques", icon: "chart" },
    ],
  },
  {
    title: "Restaurant",
    links: [
      { href: "/admin/menu", label: "Carte", icon: "menu" },
      { href: "/admin/floor", label: "Plan de salle", icon: "floor" },
      { href: "/admin/settings", label: "Réglages", icon: "settings" },
      { href: "/admin/integration", label: "Intégration", icon: "code" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation du back-office" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-5 md:overflow-visible md:pb-0">
      {GROUPS.map((group, g) => (
        <div key={g} className="flex gap-1 md:flex-col md:gap-0.5">
          {group.title && (
            <p className="hidden px-3 pb-1.5 text-[11px] font-medium tracking-wider text-stone-400 uppercase md:block">{group.title}</p>
          )}
          {group.links.map((l) => {
            const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                  active
                    ? "bg-white font-medium text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.06)] ring-1 ring-stone-900/[0.05]"
                    : "text-stone-500 hover:bg-stone-900/[0.04] hover:text-stone-900"
                }`}
              >
                <span className={`transition-colors duration-200 ${active ? "text-amber-600" : "text-stone-400 group-hover:text-stone-600"}`}>
                  <Icon name={l.icon} />
                </span>
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
