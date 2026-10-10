"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { AuthShell } from "../auth-shell";
import { resetPassword } from "../actions";

export default function NewPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, null);

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez le mot de passe de votre espace restaurant.">
      <form action={action} className="space-y-4">
        <label className="block">
          <span className={labelClass}>Nouveau mot de passe</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          <span className="mt-1 block text-xs text-stone-500">8 caractères minimum.</span>
        </label>
        <label className="block">
          <span className={labelClass}>Confirmer le mot de passe</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        {state?.error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {state.error}{" "}
            {state.error.includes("expiré") && <Link href="/mot-de-passe-oublie" className="font-medium underline">Nouveau lien</Link>}
          </p>
        )}
        <button disabled={pending} className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60">
          {pending ? "Enregistrement…" : "Enregistrer et me connecter"}
        </button>
      </form>
    </AuthShell>
  );
}
