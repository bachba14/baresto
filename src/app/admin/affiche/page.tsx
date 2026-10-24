import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { requireRestaurant } from "@/lib/data";
import { siteUrl } from "@/lib/site";
import { PrintButton } from "../print/print-button";
import { Poster, type Format } from "./poster";

export const metadata: Metadata = { title: "Affiche QR code", robots: { index: false } };

const FORMATS = [
  { id: "a4", label: "Affiche A4 (vitrine, entrée)" },
  { id: "table", label: "Chevalets de table (4 par feuille)" },
] as const;

/** Affiches à imprimer avec le QR code de la page de réservation du restaurant. */
export default async function PosterPage({ searchParams }: PageProps<"/admin/affiche">) {
  const [{ restaurant }, params, base] = await Promise.all([requireRestaurant(), searchParams, siteUrl()]);
  const format: Format = params.format === "table" ? "table" : "a4";
  const url = `${base}/r/${restaurant.slug}`;
  // QR noir sur blanc, correction d'erreur élevée : lisible même un peu abîmé ou mal éclairé.
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "Q" });

  return (
    <div className="min-h-screen bg-stone-200 py-6 print:bg-white print:py-0">
      {/* Une page A4 sans marge : le cadre est dessiné par la page elle-même. */}
      <style>{`@page { size: A4; margin: 0 } @media print { html, body { background: #fff } }`}</style>

      <div className="mx-auto mb-6 max-w-[210mm] space-y-3 px-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/integration" className="text-sm text-stone-600 hover:underline">← Retour</Link>
          <PrintButton auto={false} />
        </div>
        <nav aria-label="Format" className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Link
              key={f.id}
              href={`/admin/affiche?format=${f.id}`}
              aria-current={f.id === format ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                f.id === format ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-900/10 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <p className="rounded-lg bg-white p-3 text-sm text-stone-600">
          Dans la fenêtre d&apos;impression : papier <strong>A4</strong>, marges <strong>« Aucune »</strong> et cochez{" "}
          <strong>« Graphiques d&apos;arrière-plan »</strong> pour garder les couleurs. Testez le QR code avec votre téléphone
          avant d&apos;en imprimer plusieurs.
        </p>
      </div>

      <Poster restaurant={restaurant} format={format} url={url} qr={qr} />
      {format === "table" && (
        <p className="mx-auto mt-3 max-w-[210mm] px-4 text-center text-xs text-stone-500 print:hidden">
          Découpez le long des pointillés, puis pliez ou glissez dans un support de table (format A6).
        </p>
      )}
    </div>
  );
}
