"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Barre d'action fixée en bas de l'écran sur mobile : apparaît une fois le hero dépassé,
 * disparaît quand l'appel final est visible (pas de doublon).
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const end = document.getElementById("inscription");
    if (!hero || !end) return;
    let pastHero = false;
    let atEnd = false;
    const update = () => setVisible(pastHero && !atEnd);
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === end) atEnd = e.isIntersecting;
      }
      update();
    });
    observer.observe(hero);
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <Link
        href="/signup"
        tabIndex={visible ? 0 : -1}
        className="block rounded-xl bg-amber-700 py-3 text-center font-semibold text-white"
      >
        Créer mon restaurant
      </Link>
    </div>
  );
}
