"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Fait apparaître son contenu en douceur lorsqu'il entre dans l'écran (styles dans globals.css). */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Décalage en millisecondes, pour des apparitions en cascade. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ "--delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
