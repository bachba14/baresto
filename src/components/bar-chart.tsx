export type Bar = {
  key: string;
  /** Libellé d'axe (affiché selon la place disponible). */
  label: string;
  value: number;
  /** Texte de l'infobulle au survol. */
  tooltip: string;
  muted?: boolean;
};

/**
 * Histogramme simple (une seule série, rendu serveur) : barres fines arrondies en haut,
 * grille discrète, infobulle au survol et au focus clavier.
 */
export function BarChart({ bars, height = 180, labelEvery = 1, unit }: { bars: Bar[]; height?: number; labelEvery?: number; unit: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  // Graduation « ronde » : 1, 2, 5, 10, 20, 50…
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => max / s <= 4) ?? 1000;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <div className="flex gap-2">
      <div className="relative w-7 shrink-0 text-right text-[11px] text-stone-400 tabular-nums" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{t}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-dashed border-stone-200/70" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {bars.map((b, i) => (
              <div
                key={b.key}
                tabIndex={0}
                aria-label={b.tooltip}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <div
                  className={`animate-grow w-full max-w-8 rounded-t-[4px] transition-colors duration-200 ${
                    b.muted ? "bg-amber-600/30" : "bg-amber-600/85"
                  } group-hover:bg-amber-700 group-focus-visible:bg-amber-700`}
                  style={{
                    height: `${(b.value / top) * 100}%`,
                    minHeight: b.value > 0 ? 2 : 0,
                    // Les barres poussent l'une après l'autre (cascade plafonnée à 0,4 s).
                    "--delay": `${Math.min(i * 18, 400)}ms`,
                  } as React.CSSProperties}
                />
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md bg-stone-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow group-hover:block group-focus-visible:block">
                  {b.tooltip}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-[2px] text-[11px] text-stone-500">
          {bars.map((b, i) => (
            <span key={b.key} className="flex-1 truncate text-center">
              {i % labelEvery === 0 ? b.label : ""}
            </span>
          ))}
        </div>
        <span className="sr-only">Unité : {unit}</span>
      </div>
    </div>
  );
}
