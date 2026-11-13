"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { inputClass, labelClass } from "@/components/admin-styles";

function Fields() {
  // E-mail saisi sur la landing page (/signup?email=…) : pré-rempli, curseur directement sur le mot de passe.
  const email = useSearchParams().get("email") ?? "";
  return <Inputs email={email} />;
}

function Inputs({ email }: { email: string }) {
  return (
    <>
      <label className="block">
        <span className={labelClass}>E-mail professionnel</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={email} className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Mot de passe</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus={!!email} className={inputClass} />
        <span className="text-xs text-stone-500">8 caractères minimum.</span>
      </label>
    </>
  );
}

/** Champs e-mail et mot de passe de l'inscription. */
export function SignupFields() {
  return (
    <Suspense fallback={<Inputs email="" />}>
      <Fields />
    </Suspense>
  );
}
