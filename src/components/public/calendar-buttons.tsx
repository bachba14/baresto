"use client";

import { useSyncExternalStore } from "react";
import type { CalendarLinks } from "@/lib/calendar";

const button =
  "inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:border-[var(--brand)] hover:text-[var(--brand)] dark:border-stone-600";

/** iPhone, iPad (y compris en mode « ordinateur ») et Mac : le Calendrier d'Apple ouvre le .ics directement. */
function isAppleDevice() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua);
}

const noop = () => () => {};

/**
 * Boutons « Ajouter à mon agenda ». Google Agenda et Outlook s'ouvrent dans le navigateur ;
 * Apple Calendar n'est proposé que sur un appareil Apple (ailleurs, le fichier serait téléchargé).
 */
export function CalendarButtons({ links, className = "", center = false }: { links: CalendarLinks; className?: string; center?: boolean }) {
  // false au rendu serveur, puis détection de l'appareil côté navigateur.
  const apple = useSyncExternalStore(noop, isAppleDevice, () => false);

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm text-stone-500">Ajouter à mon agenda</p>
      <div className={`flex flex-wrap gap-2 ${center ? "justify-center" : ""}`}>
        {apple && <a href={links.apple} className={button}>Apple Calendar</a>}
        <a href={links.google} target="_blank" rel="noreferrer" className={button}>Google Agenda</a>
        <a href={links.outlook} target="_blank" rel="noreferrer" className={button}>Outlook</a>
      </div>
    </div>
  );
}
