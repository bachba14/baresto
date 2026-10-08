"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { AuthShell } from "../auth-shell";
import { GoogleButton } from "../google-button";
import { UrlError } from "../url-error";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <AuthShell title="Bon retour 👋" subtitle="Connectez-vous à votre espace restaurant.">
      <UrlError />
      <GoogleButton />
      <form action={action} className="mt-4 space-y-4">
        <label className="block">
          <span className={labelClass}>E-mail</span>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Mot de passe</span>
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60">
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-6 text-sm text-stone-500">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-amber-700 hover:underline">Créer mon restaurant</Link>
      </p>
    </AuthShell>
  );
}
