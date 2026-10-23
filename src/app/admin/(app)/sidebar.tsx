"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { LiveIndicator } from "./live-updates";
import { openNewReservation } from "./new-reservation";
import { openTour } from "./tour";
import { useIsAdmin } from "./role";
import { openNotifications } from "./notifications";


/** Icônes au trait (24 × 24). */
const ICONS = {
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
  upload: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9M10 19.5a2 2 0 0 0 4 0" />,
  team: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01" />
    </>
  ),
  logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" />,
};

type IconName = keyof typeof ICONS;

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

type NavLink = { href: string; label: string; icon: IconName; /** Réservé aux administrateurs. */ admin?: true };

const GROUPS: { title?: string; tour?: string; links: NavLink[] }[] = [
  {
    links: [
      { href: "/admin", label: "Tableau de bord", icon: "home" },
      { href: "/admin/service", label: "Service", icon: "service" },
      { href: "/admin/reservations", label: "Réservations", icon: "calendar" },
    ],
  },
  {
    title: "Suivi",
    tour: "group-suivi",
    links: [
      { href: "/admin/clients", label: "Clients", icon: "users" },
      { href: "/admin/stats", label: "Statistiques", icon: "chart", admin: true },
    ],
  },
  {
    title: "Restaurant",
    tour: "group-restaurant",
    links: [
      { href: "/admin/menu", label: "Carte", icon: "menu", admin: true },
      { href: "/admin/floor", label: "Plan de salle", icon: "floor", admin: true },
      { href: "/admin/settings", label: "Réglages", icon: "settings", admin: true },
      { href: "/admin/equipe", label: "Équipe", icon: "team", admin: true },
      { href: "/admin/import", label: "Importer", icon: "upload", admin: true },
      { href: "/admin/integration", label: "Intégration", icon: "code", admin: true },
    ],
  },
];

function Label({ children }: { children: ReactNode }) {
  return <span className="truncate whitespace-nowrap">{children}</span>;
}

export function Sidebar({
  restaurant,
  email,
}: {
  restaurant: { name: string; slug: string; color: string; initials: string };
  email: string | undefined;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const isAdmin = useIsAdmin();
  // Un employé ne voit pas les pages réservées aux administrateurs (ni un groupe devenu vide).
  const groups = GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => isAdmin || !l.admin) })).filter((g) => g.links.length > 0);

  const linkClass = (active: boolean) =>
    `group flex h-10 items-center gap-3 rounded-xl px-[15px] text-sm transition-colors duration-200 ${
      active
        ? "bg-white font-medium text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.06)] ring-1 ring-stone-900/[0.05]"
        : "text-stone-500 hover:bg-stone-900/[0.04] hover:text-stone-900"
    }`;
  const iconClass = (active: boolean) =>
    `transition-colors duration-200 ${active ? "text-amber-600" : "text-stone-500 group-hover:text-stone-600"}`;

  return (
    <>
      {/* ── Ordinateur : barre toujours ouverte ── */}
      <aside
        aria-label="Navigation du back-office"
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto py-5 md:flex"
      >
        {/* Logo */}
        <div className="flex h-10 items-center pl-[22px]">
          <Link href="/admin" aria-label="Tableau de bord" className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
              <circle cx="16" cy="16" r="15" fill="#b45309" />
              <circle cx="16" cy="16" r="6" fill="#fff" />
              {[0, 90, 180, 270].map((a) => (
                <rect key={a} x="14" y="3.5" width="4" height="4" rx="1.2" fill="#fde68a" transform={`rotate(${a} 16 16)`} />
              ))}
            </svg>
            <span className="text-lg font-bold tracking-tight text-stone-900">Monkomi</span>
          </Link>
        </div>

        {/* Restaurant */}
        <div className="mt-6 flex items-center gap-3 px-[18px]">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white"
            style={{ background: restaurant.color }}
            aria-hidden
          >
            {restaurant.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-stone-900">{restaurant.name}</span>
            <LiveIndicator />
          </span>
        </div>

        {/* Nouvelle réservation, accessible de partout (raccourci : N) */}
        <div className="mt-5 px-3">
          <button
            type="button"
            onClick={() => openNewReservation()}
            data-tour="new-reservation"
            title="Nouvelle réservation (raccourci : N)"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            <span className="text-base leading-none">+</span> Réservation
          </button>
        </div>

        {/* Liens */}
        <nav className="mt-6 space-y-4 px-3">
          {groups.map((group, g) => (
            <div key={g} data-tour={group.tour} className="space-y-0.5">
              {group.title && (
                <p className="px-[15px] pb-1 text-[11px] font-medium tracking-wider text-stone-500 uppercase">{group.title}</p>
              )}
              {group.links.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link key={l.href} href={l.href} data-tour={`nav-${l.href}`} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                    <span className={iconClass(active)}><Icon name={l.icon} /></span>
                    <Label>{l.label}</Label>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bas : page publique, compte */}
        <div className="mt-auto space-y-0.5 px-3 pt-6">
          <a href={`/r/${restaurant.slug}`} target="_blank" data-tour="public-page" className={linkClass(false)}>
            <span className={iconClass(false)}><Icon name="external" /></span>
            <Label>Ma page publique</Label>
          </a>
          <button type="button" onClick={openNotifications} className={`${linkClass(false)} w-full`}>
            <span className={iconClass(false)}><Icon name="bell" /></span>
            <Label>Notifications</Label>
          </button>
          <button type="button" onClick={openTour} className={`${linkClass(false)} w-full`}>
            <span className={iconClass(false)}><Icon name="help" /></span>
            <Label>Revoir le tuto</Label>
          </button>
          <form action={logout}>
            <button type="submit" title={email} className={`${linkClass(false)} w-full`}>
              <span className={iconClass(false)}><Icon name="logout" /></span>
              <Label>
                <span className="block text-left">Se déconnecter</span>
                <span className="block truncate text-left text-[11px] text-stone-500">{isAdmin ? "Admin" : "Employé"} · {email}</span>
              </Label>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Mobile : barre du haut + liens qui défilent ── */}
      <div className="sticky top-0 z-30 bg-[#faf9f7]/85 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <Link href="/admin" className="flex items-center gap-2.5" aria-label="Tableau de bord">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white" style={{ background: restaurant.color }} aria-hidden>
              {restaurant.initials}
            </span>
            <span className="text-sm font-medium">{restaurant.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openNewReservation()} data-tour="new-reservation" className="flex h-10 items-center rounded-lg bg-stone-900 px-3 text-sm font-medium text-white" aria-label="Nouvelle réservation">+ Résa</button>
            <button type="button" onClick={openNotifications} aria-label="Notifications" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900/5 hover:text-stone-900">
              <Icon name="bell" />
            </button>
            <button type="button" onClick={openTour} aria-label="Revoir le tuto" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900/5 hover:text-stone-900">
              <Icon name="help" />
            </button>
            <LiveIndicator />
            <form action={logout}>
              <button aria-label="Se déconnecter" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900/5 hover:text-stone-900">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Navigation du back-office" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {groups.flatMap((g) => g.links).map((l) => {
            const active = isActive(l.href);
            return (
              <Link key={l.href} href={l.href} data-tour={`nav-${l.href}`} aria-current={active ? "page" : undefined} className={`${linkClass(active)} shrink-0 px-3`}>
                <span className={iconClass(active)}><Icon name={l.icon} /></span>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
