import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/** Mise en page des écrans de connexion et d'inscription. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-stone-50 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block">
            <Logo />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-stone-500">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-stone-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#b45309_0,transparent_45%),radial-gradient(circle_at_80%_80%,#7c2d12_0,transparent_40%)] opacity-70" />
        <div className="relative flex h-full flex-col justify-end p-12 text-stone-100">
          <p className="text-3xl leading-snug font-semibold">
            Des réservations qui arrivent toutes seules, déjà placées sur la bonne table.
          </p>
          <p className="mt-4 text-stone-300">Configurez votre restaurant en 5 minutes. Gratuit pendant la bêta.</p>
        </div>
      </div>
    </main>
  );
}
