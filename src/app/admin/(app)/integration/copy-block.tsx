"use client";

import { useState } from "react";

/** Bloc de code à copier : bouton dans une barre au-dessus du code (il ne le recouvre jamais), retour à la ligne. */
export function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg bg-stone-900">
      <div className="flex justify-end border-b border-white/10 px-2 py-1.5">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white transition hover:bg-white/20"
          aria-live="polite"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <pre className="p-4 text-xs leading-relaxed break-all whitespace-pre-wrap text-stone-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
