"use client";

import { useActionState, useTransition } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { toast } from "@/components/toaster";
import { useIsAdmin } from "../role";
import { createGiftCard, deleteGiftCard, resendGiftCard, setGiftCardMonths, setGiftCardUsed, type GiftState } from "./actions";

function Feedback({ state }: { state: GiftState }) {
  if (state?.error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.ok}</p>;
  return null;
}

export function CreateGiftCardForm({ currency, months }: { currency: string; months: number }) {
  const [state, action] = useActionState(createGiftCard, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className={labelClass}>Montant ({currency === "EUR" ? "€" : currency})</span>
        <input name="amount" required inputMode="decimal" placeholder="50" className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>De la part de</span>
        <input name="offered_by" maxLength={120} placeholder="Marie et Thomas" className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Pour</span>
        <input name="recipient_name" maxLength={120} placeholder="Julie" className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Envoyer à (facultatif)</span>
        <input name="send_email" type="email" maxLength={200} placeholder="adresse e-mail" className={inputClass} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelClass}>Message (facultatif)</span>
        <input name="message" maxLength={500} placeholder="Joyeux anniversaire !" className={inputClass} />
      </label>
      <div className="space-y-2 sm:col-span-2">
        {state?.ok && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            <span className="flex-1">{state.ok}</span>
            {state.token && (
              <a href={`/bon/${state.token}`} target="_blank" className="rounded-lg bg-white px-3 py-1.5 font-medium text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50">
                🖨 Imprimer le bon
              </a>
            )}
          </div>
        )}
        {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>Créer le bon</SubmitButton>
          <span className="text-xs text-stone-500">Valable {months} mois.</span>
        </div>
      </div>
    </form>
  );
}

/** Actions d'un bon dans la liste : imprimer, marquer utilisé, renvoyer, supprimer (admins). */
export function GiftCardActions({ id, token, used, email }: { id: string; token: string; used: boolean; email: string | null }) {
  const isAdmin = useIsAdmin();
  const [pending, startTransition] = useTransition();
  const [resendState, resend] = useActionState(resendGiftCard.bind(null, id), null);
  const small = "rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-50";

  const toggle = () =>
    startTransition(async () => {
      await setGiftCardUsed(id, !used);
      toast(used ? "Bon remis comme valable." : "Bon marqué comme utilisé.", { tone: "success" });
    });
  const remove = () => {
    if (!window.confirm("Supprimer ce bon ? (Erreur de saisie ou remboursement.) Action irréversible.")) return;
    startTransition(async () => {
      await deleteGiftCard(id);
      toast("Bon supprimé.", { tone: "success" });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a href={`/bon/${token}`} target="_blank" className={`${small} text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50`}>Imprimer</a>
      <button type="button" disabled={pending} onClick={toggle} className={`${small} ${used ? "text-stone-600 hover:bg-stone-100" : "bg-stone-900 text-white hover:bg-stone-700"}`}>
        {used ? "Annuler « utilisé »" : "Marquer utilisé"}
      </button>
      <details className="relative">
        <summary className={`${small} cursor-pointer list-none text-stone-600 hover:bg-stone-100`}>Envoyer</summary>
        <form action={resend} className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-xl bg-white p-3 shadow-lg ring-1 ring-stone-900/10">
          <input name="email" type="email" required defaultValue={email ?? ""} placeholder="adresse e-mail" aria-label="Adresse e-mail" className={inputClass} />
          <Feedback state={resendState} />
          <SubmitButton className="w-full">Envoyer le bon</SubmitButton>
        </form>
      </details>
      {isAdmin && (
        <button type="button" disabled={pending} onClick={remove} className={`${small} text-red-600 hover:bg-red-50`}>Supprimer</button>
      )}
    </div>
  );
}

export function MonthsForm({ months }: { months: number }) {
  const [state, action] = useActionState(setGiftCardMonths, null);
  return (
    <form action={action} className="space-y-2">
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className={labelClass}>Validité des nouveaux bons (mois)</span>
          <input name="months" type="number" min={12} max={60} required defaultValue={months} className={inputClass} />
        </label>
        <SubmitButton variant="secondary">Enregistrer</SubmitButton>
      </div>
      <Feedback state={state} />
    </form>
  );
}
