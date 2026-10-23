"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { acceptInvitation, createAccountAndJoin } from "./actions";

const button = "w-full rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-60";
const error = "rounded-lg bg-red-50 p-3 text-sm text-red-700";

/** Nouveau compte : l'adresse est celle de l'invitation, la personne choisit son mot de passe. */
export function CreateAccountForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(createAccountAndJoin.bind(null, token), null);
  return (
    <>
      <form action={action} className="space-y-4">
        <label className="block">
          <span className={labelClass}>E-mail</span>
          <input value={email} readOnly className={`${inputClass} bg-stone-100 text-stone-500`} />
        </label>
        <label className="block">
          <span className={labelClass}>Choisissez un mot de passe</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          <span className="text-xs text-stone-500">8 caractères minimum.</span>
        </label>
        {state?.error && (
          <p className={error}>
            {state.error}
            {state.existing && <> <Link href="/login" className="font-medium underline">Se connecter</Link></>}
          </p>
        )}
        <button disabled={pending} className={button}>{pending ? "Création…" : "Rejoindre l'équipe"}</button>
      </form>
      <p className="mt-6 text-sm text-stone-500">
        Vous avez déjà un compte avec cette adresse ?{" "}
        <Link href="/login" className="font-medium text-amber-700 hover:underline">Se connecter</Link>
      </p>
    </>
  );
}

/** Déjà connecté avec la bonne adresse : un clic pour rejoindre. */
export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation.bind(null, token), null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className={error}>{state.error}</p>}
      <button disabled={pending} className={button}>{pending ? "Un instant…" : "Rejoindre l'équipe"}</button>
    </form>
  );
}
