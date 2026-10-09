"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/service", label: "Service (plan)" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/stats", label: "Statistiques" },
  { href: "/admin/menu", label: "Carte" },
  { href: "/admin/floor", label: "Plan de salle" },
  { href: "/admin/settings", label: "Réglages" },
  { href: "/admin/integration", label: "Intégration site" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative shrink-0 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
              active
                ? "bg-stone-900/[0.06] font-medium text-stone-900 md:before:absolute md:before:inset-y-2 md:before:-left-3 md:before:w-[3px] md:before:rounded-r-full md:before:bg-amber-600"
                : "text-stone-500 hover:bg-stone-900/[0.04] hover:text-stone-900"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
