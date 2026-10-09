"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";
import { LiveIndicator } from "./live-updates";


const RAIL = 72; // largeur repliée (icônes seules)
const OPEN = 256; // largeur ouverte

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
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" />,
  pin: <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v6" />,
  unpin: <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v6M3 3l18 18" />,
};

type IconName = keyof typeof ICONS;

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

const GROUPS: { title?: string; links: { href: string; label: string; icon: IconName }[] }[] = [
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

/** Libellé qui apparaît en fondu quand la barre s'ouvre (l'icône, elle, ne bouge pas). */
function Label({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${open ? "opacity-100 delay-75" : "opacity-0"}`}>
      {children}
    </span>
  );
}

export function Sidebar({
  restaurant,
  email,
  initialPinned,
}: {
  restaurant: { name: string; slug: string; color: string; initials: string };
  email: string | undefined;
  initialPinned: boolean;
}) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(initialPinned);
  const [hovered, setHovered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const open = pinned || hovered;

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    setHovered(false);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "pinned" : "rail"}; path=/admin; max-age=31536000; samesite=lax`;
  };

  // Ouverture immédiate au survol, fermeture avec un léger délai (évite les clignotements).
  const enter = () => {
    clearTimeout(closeTimer.current);
    setHovered(true);
  };
  const leave = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(false), 120);
  };

  const linkClass = (active: boolean) =>
    `group flex h-10 items-center gap-3 rounded-xl px-[15px] text-sm transition-colors duration-200 ${
      active
        ? "bg-white font-medium text-stone-900 shadow-[0_1px_2px_rgb(28_25_23/0.06)] ring-1 ring-stone-900/[0.05]"
        : "text-stone-500 hover:bg-stone-900/[0.04] hover:text-stone-900"
    }`;
  const iconClass = (active: boolean) =>
    `transition-colors duration-200 ${active ? "text-amber-600" : "text-stone-400 group-hover:text-stone-600"}`;

  return (
    <>
      {/* ── Ordinateur : rail d'icônes qui s'ouvre au survol ── */}
      <div
        className="relative hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:block"
        style={{ width: pinned ? OPEN : RAIL }}
      >
        <aside
          onMouseEnter={enter}
          onMouseLeave={leave}
          onFocus={enter}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) leave();
          }}
          aria-label="Navigation du back-office"
          className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-x-hidden overflow-y-auto py-5 transition-[width,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open && !pinned ? "bg-white shadow-[0_0_0_1px_rgb(28_25_23/0.04),0_24px_48px_-12px_rgb(28_25_23/0.25)]" : "bg-[#faf9f7]"
          }`}
          style={{ width: open ? OPEN : RAIL }}
        >
          {/* Logo + épingle */}
          <div className="flex h-10 items-center justify-between pr-3 pl-[22px]">
            <Link href="/admin" aria-label="Tableau de bord" className="flex items-center gap-2.5">
              <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
                <circle cx="16" cy="16" r="15" fill="#b45309" />
                <circle cx="16" cy="16" r="6" fill="#fff" />
                {[0, 90, 180, 270].map((a) => (
                  <rect key={a} x="14" y="3.5" width="4" height="4" rx="1.2" fill="#fde68a" transform={`rotate(${a} 16 16)`} />
                ))}
              </svg>
              <Label open={open}><span className="text-lg font-bold tracking-tight text-stone-900">Baresto</span></Label>
            </Link>
            <button
              type="button"
              onClick={togglePin}
              aria-pressed={pinned}
              aria-label={pinned ? "Replier la barre" : "Garder la barre ouverte"}
              title={pinned ? "Replier la barre" : "Garder la barre ouverte"}
              className={`rounded-lg p-1.5 text-stone-400 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 ${
                open ? "opacity-100" : "pointer-events-none opacity-0"
              } ${pinned ? "text-amber-600" : ""}`}
            >
              <Icon name={pinned ? "unpin" : "pin"} className="h-4 w-4" />
            </button>
          </div>

          {/* Restaurant */}
          <div className="mt-6 flex items-center gap-3 px-[18px]">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white"
              style={{ background: restaurant.color }}
              title={restaurant.name}
              aria-hidden
            >
              {restaurant.initials}
            </span>
            <span className={`min-w-0 transition-opacity duration-200 ${open ? "opacity-100 delay-75" : "opacity-0"}`}>
              <span className="block truncate text-sm font-medium whitespace-nowrap text-stone-900">{restaurant.name}</span>
              <LiveIndicator />
            </span>
          </div>

          {/* Liens */}
          <nav className="mt-6 space-y-4 px-3">
            {GROUPS.map((group, g) => (
              <div key={g} className="space-y-0.5">
                {group.title && (
                  <div className="relative flex h-6 items-center px-[15px]">
                    {/* Replié : un trait ; ouvert : le titre de la section. */}
                    <span className={`absolute inset-x-[15px] h-px bg-stone-900/[0.08] transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`} />
                    <Label open={open}>
                      <span className="text-[11px] font-medium tracking-wider text-stone-400 uppercase">{group.title}</span>
                    </Label>
                  </div>
                )}
                {group.links.map((l) => {
                  const active = isActive(l.href);
                  return (
                    <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} aria-label={l.label} className={linkClass(active)}>
                      <span className={iconClass(active)}><Icon name={l.icon} /></span>
                      <Label open={open}>{l.label}</Label>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bas : page publique, compte */}
          <div className="mt-auto space-y-0.5 px-3 pt-6">
            <a href={`/r/${restaurant.slug}`} target="_blank" aria-label="Ma page publique" className={linkClass(false)}>
              <span className={iconClass(false)}><Icon name="external" /></span>
              <Label open={open}>Ma page publique</Label>
            </a>
            <form action={logout}>
              <button type="submit" aria-label="Se déconnecter" title={email} className={`${linkClass(false)} w-full`}>
                <span className={iconClass(false)}><Icon name="logout" /></span>
                <Label open={open}>
                  <span className="block text-left">Se déconnecter</span>
                  <span className="block truncate text-left text-[11px] text-stone-400">{email}</span>
                </Label>
              </button>
            </form>
          </div>
        </aside>
      </div>

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
            <LiveIndicator />
            <form action={logout}>
              <button aria-label="Se déconnecter" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900/5 hover:text-stone-900">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Navigation du back-office" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {GROUPS.flatMap((g) => g.links).map((l) => {
            const active = isActive(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`${linkClass(active)} shrink-0 px-3`}>
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
