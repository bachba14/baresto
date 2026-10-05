import type { ReactNode } from "react";

/** Cadre de navigateur autour d'une capture du produit. */
export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-2xl shadow-stone-900/10">
      <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-300" />
        <span className="h-3 w-3 rounded-full bg-amber-300" />
        <span className="h-3 w-3 rounded-full bg-emerald-300" />
        <span className="ml-3 flex-1 truncate rounded-md bg-stone-100 px-3 py-1 text-xs text-stone-500">{url}</span>
      </div>
      {children}
    </div>
  );
}

/** Téléphone affichant le widget de réservation. */
export function PhoneWidget() {
  const slots = ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
  return (
    <div className="w-[230px] rounded-[2.2rem] border-[7px] border-stone-900 bg-white p-4 shadow-2xl shadow-stone-900/30">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-stone-200" />
      <p className="text-[15px] font-semibold">Réserver une table</p>
      <p className="text-[11px] text-stone-500">Le Comptoir</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="rounded-md border border-stone-300 px-2 py-1.5">👥 2 personnes</div>
        <div className="rounded-md border border-stone-300 px-2 py-1.5">📅 Ven. 14</div>
      </div>
      <p className="mt-3 mb-1 text-[11px] font-medium">Horaire</p>
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        {slots.map((s, i) => (
          <span
            key={s}
            className={`rounded-md border py-1.5 text-center ${
              i === 2 ? "border-amber-700 bg-amber-700 text-white" : i === 4 ? "border-stone-200 text-stone-300 line-through" : "border-stone-300"
            }`}
          >
            {s.replace(":", "h")}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-7 rounded-md border border-stone-200 px-2 py-1.5 text-[11px] text-stone-400">Camille Martin</div>
        <div className="h-7 rounded-md border border-stone-200 px-2 py-1.5 text-[11px] text-stone-400">06 12 34 56 78</div>
      </div>
      <div className="mt-3 rounded-lg bg-amber-700 py-2 text-center text-[12px] font-medium text-white">
        Réserver pour 2 · 20h00
      </div>
      <p className="mt-2 text-center text-[10px] text-emerald-700">✓ Confirmation immédiate · Table T3</p>
    </div>
  );
}

/** Extrait de carte en ligne. */
export function MenuMock() {
  const items = [
    { name: "Velouté de saison", desc: "Légumes du marché, crème crue", price: "9 €", tag: "végétarien" },
    { name: "Burger du chef", desc: "Bœuf français, cheddar affiné", price: "19 €" },
    { name: "Risotto aux cèpes", desc: "Parmesan 24 mois", price: "21 €", tag: "végétarien" },
    { name: "Moelleux chocolat", desc: "Cœur coulant, glace vanille", price: "8 €" },
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/5">
      <div className="mb-3 flex gap-2 text-xs">
        {["Entrées", "Plats", "Desserts", "Boissons"].map((c, i) => (
          <span key={c} className={`rounded-full border px-3 py-1 ${i === 1 ? "border-amber-700 text-amber-700" : "border-stone-200"}`}>{c}</span>
        ))}
      </div>
      <ul className="divide-y divide-stone-100">
        {items.map((i) => (
          <li key={i.name} className="flex items-start justify-between gap-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{i.name}</p>
              <p className="text-xs text-stone-500">{i.desc}</p>
              {i.tag && <span className="mt-1 inline-block rounded bg-emerald-50 px-1.5 text-[10px] text-emerald-700">{i.tag}</span>}
            </div>
            <span className="text-sm font-semibold text-amber-700">{i.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Code d'intégration stylisé. */
export function CodeMock({ base }: { base: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-stone-900 p-5 text-[13px] leading-relaxed text-stone-300 shadow-xl">
      <code>
        <span className="text-stone-500">{"<!-- Sur n'importe quelle page de votre site -->"}</span>
        {"\n"}
        <span className="text-sky-300">{"<div"}</span> <span className="text-amber-300">data-baresto</span>=
        <span className="text-emerald-300">&quot;reservation&quot;</span>
        <span className="text-sky-300">{"></div>"}</span>
        {"\n\n"}
        <span className="text-sky-300">{"<script"}</span> <span className="text-amber-300">src</span>=
        <span className="text-emerald-300">&quot;{base}/embed.js&quot;</span>
        {"\n        "}
        <span className="text-amber-300">data-restaurant</span>=<span className="text-emerald-300">&quot;le-comptoir&quot;</span>{" "}
        <span className="text-amber-300">async</span>
        <span className="text-sky-300">{"></script>"}</span>
      </code>
    </pre>
  );
}
