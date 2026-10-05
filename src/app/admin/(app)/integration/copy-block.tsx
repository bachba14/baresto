"use client";

import { useState } from "react";

export function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-stone-900 p-4 pr-24 text-xs leading-relaxed text-stone-100">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-2 right-2 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
      >
        {copied ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}
