"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { AuthShell } from "../auth-shell";
import { forgotPassword } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, null);

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien par e-mail pour en choisir un nouveau.">
      {state?.info ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.info}</p>
      ) : (
        <form action={action} className="space-y-4">
          <label className="block">
            <span className={labelClass}>E-mail du compte</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
          <button disabled={pending} className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60">
            {pending ? "Envoi…" : "Recevoir le lien"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-stone-500">
        <Link href="/login" className="font-medium text-amber-700 hover:underline">← Retour à la connexion</Link>
      </p>
    </AuthShell>
  );
}
