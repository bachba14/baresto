"use client";

import { useActionState, useState, useTransition } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { toast } from "@/components/toaster";
import { cancelInvitation, changeRole, inviteMember, removeMember, type Role } from "./actions";

export const ROLE_LABELS: Record<Role, string> = { owner: "Administrateur", staff: "Employé" };

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100"
      aria-live="polite"
    >
      {copied ? "Lien copié ✓" : "Copier le lien"}
    </button>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
        <label>
          <span className={labelClass}>E-mail</span>
          <input name="email" type="email" required maxLength={200} placeholder="prenom@exemple.be" className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Rôle</span>
          <select name="role" defaultValue="staff" className={inputClass}>
            <option value="staff">{ROLE_LABELS.staff}</option>
            <option value="owner">{ROLE_LABELS.owner}</option>
          </select>
        </label>
        <SubmitButton>Inviter</SubmitButton>
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state?.ok && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>{state.ok}</p>
          {state.link && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-xs">{state.link}</code>
              <CopyLink link={state.link} />
            </div>
          )}
        </div>
      )}
    </form>
  );
}

export function MemberRow({ id, email, role, isMe, lastAdmin }: { id: string; email: string; role: Role; isMe: boolean; lastAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<string | null>, success: string) =>
    startTransition(async () => {
      const error = await fn();
      toast(error ?? success, { tone: error ? "error" : "success" });
    });

  const onRole = (next: Role) => {
    if (isMe && next !== "owner" && !window.confirm("Vous retirer vos droits d'administrateur ? Vous n'aurez plus accès à cette page.")) return;
    run(() => changeRole(id, next), `${email} : ${ROLE_LABELS[next].toLowerCase()}.`);
  };
  const onRemove = () => {
    const question = isMe
      ? "Quitter ce restaurant ? Vous n'aurez plus accès au back-office."
      : `Retirer ${email} de l'équipe ? Cette personne n'aura plus accès au back-office.`;
    if (!window.confirm(question)) return;
    run(() => removeMember(id), `${email} a été retiré de l'équipe.`);
  };

  return (
    <li className={`flex flex-wrap items-center gap-3 px-5 py-3 ${pending ? "opacity-60" : ""}`}>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {email} {isMe && <span className="font-normal text-stone-500">(vous)</span>}
      </span>
      <select
        value={role}
        disabled={pending || lastAdmin}
        onChange={(e) => onRole(e.target.value as Role)}
        title={lastAdmin ? "Il doit rester au moins un administrateur." : undefined}
        aria-label={`Rôle de ${email}`}
        className={`${inputClass} w-auto py-1.5`}
      >
        <option value="staff">{ROLE_LABELS.staff}</option>
        <option value="owner">{ROLE_LABELS.owner}</option>
      </select>
      <button
        type="button"
        disabled={pending || lastAdmin}
        onClick={onRemove}
        title={lastAdmin ? "Il doit rester au moins un administrateur." : undefined}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {isMe ? "Quitter" : "Retirer"}
      </button>
    </li>
  );
}

export function InvitationRow({ id, email, role, link, expired }: { id: string; email: string; role: Role; link: string; expired: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="min-w-0 flex-1 truncate text-sm">
        {email}
        <span className="ml-2 text-xs text-stone-500">
          {ROLE_LABELS[role]} · {expired ? <span className="text-amber-700">expirée, invitez à nouveau</span> : "en attente"}
        </span>
      </span>
      {!expired && <CopyLink link={link} />}
      <form action={cancelInvitation.bind(null, id)}>
        <SubmitButton variant="ghost" className="rounded-lg px-3 py-1.5 text-xs">Annuler</SubmitButton>
      </form>
    </li>
  );
}
