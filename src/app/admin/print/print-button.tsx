"use client";

import { useEffect } from "react";

/** Ouvre la boîte d'impression à l'arrivée sur la page, et propose un bouton pour recommencer. */
export function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white print:hidden">
      Imprimer
    </button>
  );
}
