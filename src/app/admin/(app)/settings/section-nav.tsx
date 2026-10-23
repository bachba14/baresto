"use client";

import { useEffect, useState } from "react";

/**
 * Raccourcis vers les sections des réglages, en pastilles cliquables. La section en cours de lecture
 * est mise en évidence pendant le défilement.
 */
export function SectionNav({ sections }: { sections: readonly (readonly [string, string])[] }) {
  const [active, setActive] = useState<string | undefined>(sections[0]?.[0]);

  useEffect(() => {
    const elements = sections.map(([id]) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    // Section active : la dernière dont le haut est passé sous la barre de navigation.
    const update = () => {
      let current: string | undefined = elements[0]?.id;
      for (const el of elements) if (el.getBoundingClientRect().top <= 120) current = el.id;
      // Tout en bas de la page, la dernière section est forcément celle qu'on lit.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = elements.at(-1)?.id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sections]);

  return (
    <nav aria-label="Sections des réglages" className="z-20 -mx-4 flex gap-2 overflow-x-auto bg-[#faf9f7]/90 px-4 py-3 backdrop-blur md:sticky md:top-0">
      {sections.map(([id, label]) => {
        const current = id === active;
        return (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActive(id)}
            aria-current={current ? "location" : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              current
                ? "bg-stone-900 text-white shadow-sm"
                : "bg-white text-stone-700 shadow-[0_1px_2px_rgb(28_25_23/0.06)] ring-1 ring-stone-900/10 hover:bg-stone-50 hover:text-stone-900 hover:ring-stone-900/25"
            }`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
