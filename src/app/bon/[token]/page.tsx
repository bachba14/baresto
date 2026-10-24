import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/app/admin/print/print-button";
import { formatDate, formatPrice } from "@/lib/format";
import { getPublicGiftCard } from "./data";

export const metadata: Metadata = { title: "Bon cadeau", robots: { index: false } };

/** Bon cadeau à imprimer ou à enregistrer en PDF (lien envoyé par e-mail) : moitié de page A4. */
export default async function GiftCardPage({ params }: PageProps<"/bon/[token]">) {
  const { token } = await params;
  const card = await getPublicGiftCard(token);
  if (!card) notFound();

  const color = /^#[0-9a-f]{6}$/i.test(card.primary_color) ? card.primary_color : "#b45309";
  const contact = [[card.address, card.city].filter(Boolean).join(", "), card.phone].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-stone-200 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 0 } @media print { html, body { background: #fff } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-stone-600">
          Pour un PDF, choisissez « Enregistrer au format PDF » comme imprimante, et cochez « Graphiques d&apos;arrière-plan ».
        </p>
        <PrintButton auto={false} />
      </div>
      {card.used_at && (
        <p className="mx-auto mb-4 max-w-[210mm] rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900 print:hidden">
          Ce bon a déjà été utilisé le {formatDate(card.used_at.slice(0, 10))}.
        </p>
      )}

      <div className="mx-auto h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white shadow-xl print:shadow-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <div className="flex h-[148.5mm] border-b border-dashed border-stone-300">
          <div className="flex w-[70mm] flex-col justify-between p-[9mm] text-white" style={{ background: color }}>
            <div>
              <p className="text-[4mm] tracking-[0.3em] uppercase opacity-90">Bon cadeau</p>
              <p className="font-display mt-[3mm] text-[8.5mm] leading-tight font-bold break-words">{card.restaurant_name}</p>
            </div>
            <p className="text-[11mm] leading-none font-bold">{formatPrice(Number(card.amount), card.currency)}</p>
          </div>
          <div className="flex flex-1 flex-col justify-between p-[10mm]">
            <div className="space-y-[5mm]">
              {card.recipient_name && (
                <div>
                  <p className="text-[3.6mm] tracking-wide text-stone-500 uppercase">Pour</p>
                  <p className="font-display text-[8mm] leading-tight font-bold">{card.recipient_name}</p>
                </div>
              )}
              {card.offered_by && (
                <div>
                  <p className="text-[3.6mm] tracking-wide text-stone-500 uppercase">De la part de</p>
                  <p className="text-[6mm]">{card.offered_by}</p>
                </div>
              )}
              {card.message && <p className="text-[4.8mm] text-stone-600 italic">« {card.message} »</p>}
            </div>
            <div className="space-y-[2mm] border-t border-stone-200 pt-[4mm] text-[3.6mm] text-stone-600">
              <p>
                Valable jusqu&apos;au <strong className="text-stone-900">{formatDate(card.expires_at).replace(/^\S+ /, "")}</strong>, à
                présenter au restaurant.
              </p>
              {contact && <p className="text-stone-500">{contact}</p>}
            </div>
          </div>
        </div>
        <p className="pt-[4mm] text-center text-[3mm] text-stone-400 print:hidden">Découpez le long des pointillés.</p>
      </div>
    </div>
  );
}
