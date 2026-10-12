"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

// Retour / avance du navigateur : on laisse le navigateur restaurer la position de défilement.
let historyNavigation = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    historyNavigation = true;
  });
}

/**
 * Remet la page en haut à chaque changement de page du back-office, sauf avec le bouton retour.
 * Basé sur le chemin : un simple changement de date (?date=…) ne fait pas remonter la page.
 */
export function ScrollReset() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (historyNavigation) {
      historyNavigation = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
