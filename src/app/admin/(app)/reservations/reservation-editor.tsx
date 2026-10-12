"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { inputClass, labelClass } from "@/components/admin-styles";
import { toast } from "@/components/toaster";
import { STATUS_LABELS } from "@/lib/format";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { deleteReservation, editReservation, updateStatus } from "./actions";

type Editable = Pick<Reservation, "id" | "date" | "time" | "party_size" | "name" | "email" | "phone" | "notes" | "status">;

/** Action principale selon le statut : une seule, la plus probable pendant le service. */
const PRIMARY: Partial<Record<ReservationStatus, { to: ReservationStatus; label: string }>> = {
  pending: { to: "confirmed", label: "Confirmer" },
  confirmed: { to: "seated", label: "Installer" },
  seated: { to: "finished", label: "Partie" },
  finished: { to: "seated", label: "Réinstaller" },
  cancelled: { to: "confirmed", label: "Réactiver" },
  no_show: { to: "confirmed", label: "Réactiver" },
};

const ACTIVE: ReservationStatus[] = ["pending", "confirmed", "seated"];

/**
 * Actions d'une ligne de réservation : un bouton principal selon le statut, les autres dans un menu « ⋯ »
 * (Modifier, Non venue, Annuler la réservation, Supprimer). Annulation possible depuis la notification.
 */
export function RowActions({ r }: { r: Editable }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const primary = PRIMARY[r.status];

  // Fermeture du menu : clic à l'extérieur ou Échap.
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  /** Change le statut ; la notification propose de revenir en arrière. */
  const setStatus = (to: ReservationStatus, { undo = true } = {}) => {
    const from = r.status;
    setMenu(false);
    startTransition(async () => {
      try {
        await updateStatus(r.id, to);
        toast(`${r.name} : ${STATUS_LABELS[to].toLowerCase()}`, {
          tone: "success",
          undo: undo ? () => updateStatus(r.id, from) : undefined,
        });
      } catch {
        toast("Action impossible, réessayez.", { tone: "error" });
      }
    });
  };

  const cancel = () => {
    const warn = r.email ? "\n\nLe client sera prévenu par e-mail." : "";
    if (!window.confirm(`Annuler la réservation de ${r.name} ?${warn}`)) return;
    setStatus("cancelled", { undo: false });
  };

  const remove = () => {
    setMenu(false);
    if (!window.confirm(`Supprimer définitivement la réservation de ${r.name} ?\n\nElle sera effacée de l'historique et des statistiques. Aucun e-mail n'est envoyé.`)) return;
    startTransition(async () => {
      try {
        await deleteReservation(r.id);
        toast("Réservation supprimée", { tone: "success" });
      } catch {
        toast("Suppression impossible, réessayez.", { tone: "error" });
      }
    });
  };

  const item = "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-50";

  return (
    <>
      <div className="flex items-center gap-1">
        {primary && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus(primary.to)}
            className="min-h-10 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {primary.label}
          </button>
        )}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label={`Autres actions pour ${r.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-lg leading-none text-stone-600 transition hover:bg-stone-50"
          >
            ⋯
          </button>
          {menu && (
            <div role="menu" className="animate-rise absolute right-0 z-20 mt-1 w-60 rounded-xl bg-white p-1 shadow-lg ring-1 ring-stone-900/10">
              <button type="button" role="menuitem" className={item} onClick={() => { setMenu(false); setEditing(true); }}>
                Modifier
              </button>
              {ACTIVE.includes(r.status) && (
                <button type="button" role="menuitem" className={item} onClick={() => setStatus("no_show")}>
                  Non venue
                </button>
              )}
              {ACTIVE.includes(r.status) && (
                <button type="button" role="menuitem" className={item} onClick={cancel}>
                  <span>
                    Annuler la réservation
                    <span className="block text-xs text-stone-500">{r.email ? "le client est prévenu par e-mail" : "la table est libérée"}</span>
                  </span>
                </button>
              )}
              <div className="my-1 border-t border-stone-100" />
              <button type="button" role="menuitem" className={`${item} text-red-700 hover:bg-red-50`} onClick={remove}>
                <span>
                  Supprimer définitivement
                  <span className="block text-xs text-red-600/80">effacée de l&apos;historique, sans e-mail</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && <EditForm r={r} onClose={() => setEditing(false)} />}
    </>
  );
}

/** Formulaire de modification, déplié sous la ligne de la réservation. */
function EditForm({ r, onClose }: { r: Editable; onClose: () => void }) {
  const [result, action, pending] = useActionState(editReservation.bind(null, r.id), null);

  // Une modification réussie referme le formulaire.
  useEffect(() => {
    if (result?.ok) {
      toast(result.ok.replace(" ✓", ""), { tone: result.ok.includes("aucune table") ? "info" : "success" });
      onClose();
    }
  }, [result, onClose]);

  return (
    <form action={action} className="animate-rise grid w-full basis-full gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-4">
      <label>
        <span className={labelClass}>Date</span>
        <input type="date" name="date" defaultValue={r.date} required className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Heure</span>
        <input type="time" name="time" defaultValue={r.time.slice(0, 5)} required className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Couverts</span>
        <input type="number" name="party_size" min={1} max={100} defaultValue={r.party_size} required className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Nom</span>
        <input name="name" defaultValue={r.name} required minLength={2} maxLength={120} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Téléphone</span>
        <input name="phone" type="tel" defaultValue={r.phone ?? ""} maxLength={40} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>E-mail</span>
        <input name="email" type="email" defaultValue={r.email ?? ""} maxLength={200} className={inputClass} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelClass}>Remarques</span>
        <input name="notes" defaultValue={r.notes ?? ""} maxLength={1000} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100">
          Fermer
        </button>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" name="send_email" defaultChecked />
          Prévenir le client par e-mail si la date, l&apos;heure ou les couverts changent
        </label>
        {result?.error && <span className="text-sm text-red-700">{result.error}</span>}
      </div>
    </form>
  );
}
