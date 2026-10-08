"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { AuthShell } from "../auth-shell";
import { GoogleButton } from "../google-button";
import { UrlError } from "../url-error";
import { signup } from "../actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

  return (
    <AuthShell title="Créez votre restaurant" subtitle="Gratuit pendant la bêta · sans carte bancaire.">
      {state?.info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <p className="text-2xl">📬</p>
          <p className="mt-2 font-medium">{state.info}</p>
          <p className="mt-2 text-sm text-emerald-800">Pensez à vérifier vos courriers indésirables.</p>
        </div>
      ) : (
        <>
        <UrlError />
        <GoogleButton />
        <form action={action} className="mt-4 space-y-4">
          <label className="block">
            <span className={labelClass}>E-mail professionnel</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Mot de passe</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            <span className="text-xs text-stone-500">8 caractères minimum.</span>
          </label>
          {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
          <button disabled={pending} className="w-full rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-60">
            {pending ? "Création…" : "Commencer gratuitement"}
          </button>
        </form>
        </>
      )}
      <p className="mt-4 text-xs text-stone-400">
        En créant un compte, vous acceptez notre{" "}
        <Link href="/confidentialite" className="underline hover:text-stone-600">politique de confidentialité</Link>.
      </p>
      <p className="mt-6 text-sm text-stone-500">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-amber-700 hover:underline">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
