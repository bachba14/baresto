import type { CSSProperties } from "react";
import type { Restaurant } from "@/lib/types";

export type Format = "a4" | "table";

/** Page A4 imprimable avec le QR code de réservation : affiche, ou 4 chevalets de table à découper. */
export function Poster({ restaurant, format, url, qr }: { restaurant: Pick<Restaurant, "name" | "tagline" | "phone" | "primary_color">; format: Format; url: string; qr: string }) {
  const shortUrl = url.replace(/^https?:\/\//, "");
  const color = /^#[0-9a-f]{6}$/i.test(restaurant.primary_color) ? restaurant.primary_color : "#b45309";
  const exact: CSSProperties = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" };

  return (
    <div className="mx-auto h-[297mm] w-[210mm] overflow-hidden bg-white text-stone-900 shadow-xl print:shadow-none" style={exact}>
      {format === "a4" ? (
        <div className="flex h-full flex-col items-center text-center">
          <div className="w-full px-[15mm] py-[14mm] text-white" style={{ background: color }}>
            <p className="font-display text-[15mm] leading-tight font-bold break-words">{restaurant.name}</p>
            {restaurant.tagline && <p className="mt-[3mm] text-[5mm] opacity-90">{restaurant.tagline}</p>}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-[15mm]">
            <p className="font-display text-[12mm] leading-tight font-bold">Réservez votre table en ligne</p>
            <p className="mt-[3mm] text-[5.5mm] text-stone-600">Disponibilités en temps réel, confirmation immédiate</p>
            <div
              className="mt-[10mm] h-[105mm] w-[105mm] rounded-[4mm] border-[1mm] p-[6mm] [&_svg]:h-full [&_svg]:w-full"
              style={{ borderColor: color }}
              dangerouslySetInnerHTML={{ __html: qr }}
              role="img"
              aria-label={`QR code vers ${shortUrl}`}
            />
            <p className="mt-[7mm] text-[6mm] font-medium">Scannez avec l&apos;appareil photo de votre téléphone</p>
            <p className="mt-[2mm] font-mono text-[5mm] text-stone-600">{shortUrl}</p>
          </div>
          {restaurant.phone && (
            <p className="w-full border-t border-stone-200 py-[8mm] text-[5.5mm] text-stone-700">
              Ou par téléphone : <strong>{restaurant.phone}</strong>
            </p>
          )}
        </div>
      ) : (
        <div className="grid h-full grid-cols-2 grid-rows-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex flex-col items-center justify-center px-[8mm] text-center ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-dashed border-stone-400`}
            >
              <p className="font-display text-[7mm] leading-tight font-bold break-words" style={{ color }}>{restaurant.name}</p>
              <p className="mt-[2mm] text-[4.2mm] font-medium">Réservez votre prochaine table</p>
              <div
                className="mt-[5mm] h-[58mm] w-[58mm] [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
                role="img"
                aria-label={`QR code vers ${shortUrl}`}
              />
              <p className="mt-[4mm] text-[3.6mm] text-stone-600">Scannez avec votre téléphone</p>
              <p className="mt-[1mm] font-mono text-[3.2mm] break-all text-stone-500">{shortUrl}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
