"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { markTourDone } from "./tour-actions";

const OPEN_EVENT = "monkomi:tour";
/** Repli local : évite de revoir la visite si l'enregistrement sur le compte a échoué. */
const STORAGE_KEY = "monkomi-tour-done";

/** Relance la visite guidée (bouton « Revoir le tuto »). */
export function openTour() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Step = {
  /** Élément mis en lumière (attribut data-tour) ; absent → bulle au centre de l'écran. */
  target?: string;
  /** Cible de repli quand la première n'est pas visible (barre mobile, sans groupes). */
  fallback?: string;
  /** Page ouverte pendant l'étape, pour que l'utilisateur voie ce dont on parle. */
  page?: string;
  emoji: string;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    page: "/admin",
    emoji: "👋",
    title: "Bienvenue sur Monkomi !",
    text: "On vous fait faire le tour du propriétaire en moins d'une minute. Vous pourrez revoir ce tuto quand vous voulez.",
  },
  {
    target: "new-reservation",
    page: "/admin",
    emoji: "➕",
    title: "Ajouter une réservation",
    text: "Un client appelle ? Cliquez ici pour noter sa réservation. Astuce : la touche N fait la même chose, depuis n'importe quelle page.",
  },
  {
    target: "nav-/admin",
    page: "/admin",
    emoji: "🏠",
    title: "Tableau de bord",
    text: "Votre point de départ : les réservations du jour et vos chiffres clés en un coup d'œil.",
  },
  {
    target: "nav-/admin/service",
    page: "/admin/service",
    emoji: "🍽️",
    title: "Service",
    text: "À ouvrir pendant le service : voyez qui arrive, installez les clients à leur table et marquez-les arrivés puis partis.",
  },
  {
    target: "nav-/admin/reservations",
    page: "/admin/reservations",
    emoji: "📅",
    title: "Réservations",
    text: "Toutes vos réservations, jour par jour ou sur le mois. Cliquez sur une réservation pour la modifier, la confirmer ou l'annuler.",
  },
  {
    target: "group-suivi",
    fallback: "nav-/admin/clients",
    page: "/admin/clients",
    emoji: "📈",
    title: "Clients et statistiques",
    text: "Votre fichier clients se remplit tout seul (habitués, allergies, notes…) et les statistiques montrent comment évolue votre activité.",
  },
  {
    target: "group-restaurant",
    fallback: "nav-/admin/menu",
    page: "/admin/floor",
    emoji: "🪑",
    title: "Votre restaurant",
    text: "Mettez votre carte en ligne, dessinez votre plan de salle et ajustez vos horaires ou jours de fermeture dans les Réglages.",
  },
  {
    target: "public-page",
    emoji: "🔗",
    title: "Votre page de réservation",
    text: "C'est la page que voient vos clients. Partagez son lien sur Google, Instagram ou Facebook pour recevoir des réservations en ligne.",
  },
  {
    page: "/admin",
    emoji: "🎉",
    title: "C'est parti !",
    text: "Premier conseil : dessinez votre plan de salle, puis faites une réservation test depuis votre page publique. Ce tuto reste disponible via « Revoir le tuto » dans le menu.",
  },
];

/** Élément visible correspondant à la cible (la barre latérale ordinateur et la barre mobile ont chacune le leur). */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;
const CARD_W = 340;

export function Tour({ autoStart }: { autoStart: boolean }) {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1024);
  const router = useRouter();
  const pathname = usePathname();

  // Ouverture automatique à la première visite, ou à la demande.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    // Petit délai : la page apparaît d'abord, la visite ensuite.
    const timer = autoStart && !seen ? setTimeout(() => setStep(0), 500) : undefined;
    const onOpen = () => setStep(0);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [autoStart]);

  const close = useCallback(() => {
    setStep(null);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    if (autoStart) void markTourDone().catch(() => {});
  }, [autoStart]);

  const current = step === null ? null : STEPS[step];
  const last = step === STEPS.length - 1;
  const next = useCallback(() => (last ? close() : setStep((s) => (s ?? 0) + 1)), [last, close]);
  const prev = useCallback(() => setStep((s) => Math.max(0, (s ?? 0) - 1)), []);

  // Ouvre la page de l'étape en cours (la visite reste affichée : elle vit dans le layout).
  useEffect(() => {
    if (current?.page && current.page !== pathname) router.push(current.page, { scroll: false });
  }, [current, pathname, router]);

  // Position de l'élément mis en lumière, suivie au redimensionnement et au défilement.
  useLayoutEffect(() => {
    if (!current) return;
    const el = (current.target && findTarget(current.target)) || (current.fallback && findTarget(current.fallback)) || null;
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const measure = () => {
      setVw(window.innerWidth);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [current]);

  // Clavier : flèches pour avancer / reculer, Échap pour quitter.
  // En phase de capture pour ne pas déclencher les autres raccourcis (N) pendant la visite.
  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [step, close, next, prev]);

  if (!current || step === null) return null;

  // Bulle : à droite de la cible si la place le permet (barre latérale), sinon en bas de l'écran.
  const side = rect && vw >= 768 && rect.left + rect.width + 16 + CARD_W < vw;
  const cardStyle: React.CSSProperties = side
    ? { top: Math.max(16, Math.min(rect.top, window.innerHeight - 280)), left: rect.left + rect.width + 16, width: CARD_W }
    : {};
  const cardPos = side
    ? "fixed"
    : rect
      ? "fixed inset-x-4 bottom-4 mx-auto max-w-sm"
      : "fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2";

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Voile : bloque les clics sur la page pendant la visite. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-amber-400 transition-all duration-300 ease-out"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgb(28 25 23 / 0.4)" }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-stone-900/40" />
      )}

      <div
        key={step}
        className={`${cardPos} animate-rise rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-stone-900/5`}
        style={cardStyle}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>{current.emoji}</span>
          <div className="min-w-0">
            <h2 id="tour-title" className="text-lg leading-tight text-stone-900">{current.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{current.text}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-1" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-4 bg-amber-500" : "w-1.5 bg-stone-200"}`} />
          ))}
        </div>

        {/* Points et boutons sur deux lignes : sur une seule, les boutons débordaient de la bulle. */}
        <div className="mt-4 flex items-center justify-between gap-2">
          {!last ? (
            <button type="button" onClick={close} className="-ml-2.5 rounded-lg px-2.5 py-2 text-sm text-stone-500 hover:text-stone-900">
              Passer
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={prev} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium hover:bg-stone-50">
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={next}
              autoFocus
              className="rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              {step === 0 ? "Commencer" : last ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
