"use client";

import { useEffect } from "react";

/** Transmet la hauteur du contenu à la page hôte pour redimensionner l'iframe. */
export function AutoHeight({ frameId }: { frameId: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    const el = document.getElementById("baresto-widget");
    if (!el) return;

    let last = 0;
    const send = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ type: "baresto:resize", frameId, height }, "*");
    };
    const ro = new ResizeObserver(send);
    ro.observe(el);
    send();
    return () => ro.disconnect();
  }, [frameId]);

  return null;
}
