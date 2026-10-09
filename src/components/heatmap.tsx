/**
 * Carte de chaleur (rendu serveur) : une seule teinte, de clair (peu) à foncé (beaucoup).
 * Infobulle au survol et au focus clavier, valeur lisible dans chaque cellule.
 */
export function Heatmap({
  rows,
  columns,
  value,
  tooltip,
}: {
  rows: { key: string; label: string }[];
  columns: { key: string; label: string }[];
  value: (row: string, column: string) => number;
  tooltip: (row: string, column: string) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => columns.map((c) => value(r.key, c.key))));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-[11px] tabular-nums">
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c.key} className="px-0.5 pb-1 text-center font-normal text-stone-500">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th className="pr-2 text-left font-normal text-stone-500">{r.label}</th>
              {columns.map((c) => {
                const v = value(r.key, c.key);
                const ratio = v / max;
                return (
                  <td key={c.key} className="p-0">
                    <div
                      tabIndex={0}
                      aria-label={tooltip(r.key, c.key)}
                      className="group relative flex h-7 min-w-8 items-center justify-center rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                      style={{ background: v ? `rgb(217 119 6 / ${0.12 + ratio * 0.88})` : "rgb(245 245 244)" }}
                    >
                      <span className={ratio > 0.55 ? "text-white" : "text-stone-700"}>{v ? v : ""}</span>
                      <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md bg-stone-900 px-2 py-1 whitespace-nowrap text-white shadow group-hover:block group-focus-visible:block">
                        {tooltip(r.key, c.key)}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
