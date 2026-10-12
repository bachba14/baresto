"use client";

import { useEffect, useState } from "react";

type ToastInput = { text: string; tone?: "success" | "error" | "info"; undo?: () => void | Promise<void> };
type Toast = ToastInput & { id: number };

const EVENT = "monkomi:toast";

/** Affiche une notification en bas de l'écran, depuis n'importe quel composant client. */
export function toast(text: string, options: Omit<ToastInput, "text"> = {}) {
  window.dispatchEvent(new CustomEvent<ToastInput>(EVENT, { detail: { text, ...options } }));
}

/** Zone des notifications (montée une fois dans le layout). */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastInput>).detail;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { ...detail, id }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), detail.undo ? 7000 : 4500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`animate-rise pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${
            t.tone === "error" ? "bg-red-700 text-white" : "bg-stone-900 text-white"
          }`}
        >
          <span className="flex-1">{t.tone === "success" ? "✓ " : ""}{t.text}</span>
          {t.undo && (
            <button
              type="button"
              onClick={async () => {
                dismiss(t.id);
                await t.undo?.();
              }}
              className="rounded-md px-2 py-1 font-medium text-amber-300 hover:bg-white/10"
            >
              Annuler
            </button>
          )}
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer la notification" className="rounded-md px-1.5 text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
