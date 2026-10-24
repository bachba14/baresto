"use client";

import { useEffect } from "react";

/** Bouton d'impression ; par défaut, ouvre aussi la boîte d'impression à l'arrivée sur la page. */
export function PrintButton({ auto = true }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white print:hidden">
      Imprimer
    </button>
  );
}
