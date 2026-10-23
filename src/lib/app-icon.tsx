import { ImageResponse } from "next/og";

/**
 * Icône de l'application installée : le logo (table ronde et quatre chaises) sur fond ambre plein,
 * sans transparence, pour iOS et pour les icônes « maskable » d'Android (logo dans la zone sûre centrale).
 */
export function appIcon(size: number) {
  const u = size / 32; // le logo est dessiné sur une grille de 32
  const square = (left: number, top: number) => (
    <div style={{ position: "absolute", left: left * u, top: top * u, width: 4 * u, height: 4 * u, borderRadius: 1.2 * u, background: "#fde68a" }} />
  );
  return new ImageResponse(
    (
      <div style={{ position: "relative", width: size, height: size, display: "flex", background: "#b45309" }}>
        <div style={{ position: "absolute", left: 10 * u, top: 10 * u, width: 12 * u, height: 12 * u, borderRadius: "50%", background: "#fff" }} />
        {square(14, 3.5)}
        {square(24.5, 14)}
        {square(14, 24.5)}
        {square(3.5, 14)}
      </div>
    ),
    { width: size, height: size },
  );
}
