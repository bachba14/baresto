import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LEGAL } from "@/lib/legal";

const PAGES = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions", label: "Conditions générales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/sous-traitance", label: "Sous-traitance des données" },
];

/** Gabarit commun des pages légales : en-tête, titre, date, texte et liens entre les pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffaf3] text-stone-800">
      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link href="/"><Logo /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : {updated}</p>

        <div className="mt-8 space-y-8 leading-relaxed [&_a]:text-amber-700 [&_a]:underline [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_p+ul]:mt-2 [&_ul+p]:mt-3">
          {children}
        </div>
      </main>

      <footer className="border-t border-stone-200 py-8 text-sm text-stone-500">
        <nav aria-label="Pages légales" className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 px-4">
          <Link href="/" className="hover:text-stone-900">← Accueil</Link>
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-stone-900">{p.label}</Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}

/** Valeur d'identité de l'éditeur, ou repère visible tant qu'elle n'est pas renseignée. */
export function Legal({ value, label }: { value: string | null; label: string }) {
  if (value) return <>{value}</>;
  return <mark className="rounded bg-amber-100 px-1 text-amber-900">[{label} à compléter]</mark>;
}

/** Lien e-mail de contact de l'éditeur. */
export function ContactEmail() {
  return LEGAL.email ? <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : <Legal value={null} label="e-mail de contact" />;
}
