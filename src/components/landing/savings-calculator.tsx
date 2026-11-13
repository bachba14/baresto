"use client";

import { useState } from "react";

const euros = (n: number) => new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Ce que coûtent les commissions par couvert sur un an, et donc ce que le restaurateur garde avec Monkomi. */
export function SavingsCalculator() {
  const [covers, setCovers] = useState(400);
  const [fee, setFee] = useState(2);
  const yearly = covers * fee * 12;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/[0.06] sm:p-8">
      <label className="block">
        <span className="flex items-baseline justify-between text-sm text-stone-600">
          Couverts réservés en ligne par mois
          <span className="text-base font-semibold text-stone-900 tabular-nums">{covers}</span>
        </span>
        <input
          type="range"
          min={50}
          max={2000}
          step={50}
          value={covers}
          onChange={(e) => setCovers(Number(e.target.value))}
          className="mt-3 w-full accent-amber-700"
        />
      </label>
      <label className="mt-6 block">
        <span className="flex items-baseline justify-between text-sm text-stone-600">
          Commission par couvert
          <span className="text-base font-semibold text-stone-900 tabular-nums">{fee.toFixed(2).replace(".", ",")} €</span>
        </span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.25}
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          className="mt-3 w-full accent-amber-700"
        />
      </label>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-stone-50 p-4">
          <p className="text-xs text-stone-500">Avec une commission</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-400 tabular-nums line-through decoration-1">
            {euros(yearly)}
          </p>
          <p className="text-xs text-stone-400">par an</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-xs text-amber-800">Avec Monkomi</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-amber-800 tabular-nums">0 €</p>
          <p className="text-xs text-amber-700">de commission</p>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-stone-600" aria-live="polite">
        Soit <strong className="text-stone-900 tabular-nums">{euros(yearly)}</strong> qui restent dans votre caisse chaque année.
      </p>
    </div>
  );
}
