"use client";

import { useEffect, useRef } from "react";

const format = (n: number, decimals: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Nombre qui défile jusqu'à sa valeur (à l'affichage, puis à chaque mise à jour en direct).
 * Rendu serveur avec la valeur finale ; rien n'est animé si l'utilisateur réduit les animations.
 */
export function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = value;
      return;
    }
    const from = shown.current;
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      el.textContent = format(current, decimals) + suffix;
      shown.current = current;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value, decimals) + suffix}
    </span>
  );
}
