"use client";

import Link from "next/link";

/** Sélecteur à onglets (liens) avec un indicateur qui glisse vers l'option active. */
export function Segmented({ items, active }: { items: { href: string; label: string }[]; active: number }) {
  return (
    <div
      className="relative grid rounded-xl bg-stone-100 p-1 text-sm"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-lg bg-white shadow-sm ring-1 ring-stone-900/5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.5rem) / ${items.length})`, transform: `translateX(${active * 100}%)` }}
      />
      {items.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={false}
          aria-current={i === active ? "page" : undefined}
          className={`relative z-10 px-3 py-1.5 text-center whitespace-nowrap transition-colors duration-300 ${
            i === active ? "font-medium text-stone-900" : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
