"use client";

import { useActionState, useState } from "react";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { HoursEditor } from "@/components/hours-editor";
import type { OpeningHours, Restaurant } from "@/lib/types";
import { saveSettings } from "./actions";

export function SettingsForm({ restaurant: settings, tableCount }: { restaurant: Restaurant; tableCount: number }) {
  const [autoConfirm, setAutoConfirm] = useState(settings.auto_confirm);
  const [result, action, pending] = useActionState(saveSettings, null);
  const [hours, setHours] = useState<OpeningHours>(settings.opening_hours ?? {});
  const [color, setColor] = useState(settings.primary_color);

  const field = (name: keyof Restaurant, label: string, props: React.ComponentProps<"input"> = {}) => (
    <label>
      <span className={labelClass}>{label}</span>
      <input name={name} defaultValue={String(settings[name] ?? "")} className={inputClass} {...props} />
    </label>
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="opening_hours" value={JSON.stringify(hours)} />

      <section className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
        <h2 className="font-semibold sm:col-span-2">Établissement</h2>
        {field("name", "Nom", { required: true })}
        {field("tagline", "Accroche")}
        {field("phone", "Téléphone", { type: "tel" })}
        {field("email", "E-mail", { type: "email" })}
        <div className="sm:col-span-2">{field("address", "Adresse")}</div>
        <label>
          <span className={labelClass}>Couleur principale (widgets)</span>
          <div className="flex items-center gap-2">
            <input type="color" name="primary_color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-stone-300" />
            <span className="rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: color }}>Aperçu bouton</span>
          </div>
        </label>
      </section>

      <section className={`${cardClass} grid gap-4 sm:grid-cols-3`}>
        <h2 className="font-semibold sm:col-span-3">Réservations en ligne</h2>
        {field("max_covers_per_slot", "Couverts max par créneau", { type: "number", min: 1 })}
        {field("max_party_size", "Taille de groupe max", { type: "number", min: 1 })}
        {field("slot_minutes", "Intervalle des créneaux (min)", { type: "number", min: 5, step: 5 })}
        {field("booking_days_ahead", "Réservable jusqu'à (jours)", { type: "number", min: 0 })}
        {field("min_notice_minutes", "Délai minimum (min)", { type: "number", min: 0 })}
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="auto_confirm" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} />
          Confirmer automatiquement
        </label>
        {autoConfirm && (
          <p className={`rounded-lg p-3 text-sm sm:col-span-3 ${tableCount ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            {tableCount
              ? `Chaque réservation en ligne est confirmée et placée automatiquement sur une de vos ${tableCount} tables. Si aucune table ne convient, le créneau n’est pas proposé : vous n’avez rien à valider.`
              : "Attention : sans plan de tables, seule la limite de couverts par créneau protège contre le surbooking. Configurez vos tables dans « Plan de salle » (configuration rapide)."}
          </p>
        )}
        {field("lunch_minutes", "Durée d’un repas le midi (min)", { type: "number", min: 15, step: 15 })}
        {field("dinner_minutes", "Durée d’un repas le soir (min)", { type: "number", min: 15, step: 15 })}
        {field("dinner_from", "Le service du soir commence à", { type: "time" })}
        <label className="sm:col-span-3">
          <span className={labelClass}>Message affiché sur le formulaire</span>
          <textarea name="reservation_message" rows={2} defaultValue={settings.reservation_message ?? ""} placeholder="Ex. : au-delà de 8 personnes, appelez-nous." className={inputClass} />
        </label>
      </section>

      <section className={`${cardClass} grid gap-4`}>
        <div>
          <h2 className="font-semibold">E-mails aux clients</h2>
          <p className="text-sm text-stone-500">
            Chaque client qui laisse son e-mail reçoit une confirmation avec un lien pour modifier ou annuler en ligne, jusqu&apos;au délai choisi ci-dessous. Les nouvelles réservations vous sont signalées à l&apos;adresse e-mail de l&apos;établissement ci-dessus.
          </p>
        </div>
        <label className="max-w-xs">
          <span className={labelClass}>Modification / annulation en ligne jusqu&apos;à (heures avant le repas)</span>
          <input
            name="cancel_deadline_hours"
            type="number"
            min={0}
            max={168}
            defaultValue={settings.cancel_deadline_hours}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-stone-500">24 h par défaut. 0 = jusqu&apos;à l&apos;heure du repas.</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="send_reminders" defaultChecked={settings.send_reminders} />
          Envoyer un rappel avant le repas (dans les 48 h qui précèdent)
        </label>
        <label>
          <span className={labelClass}>Lien pour laisser un avis (Google, TripAdvisor…)</span>
          <input
            name="review_url"
            type="url"
            defaultValue={settings.review_url ?? ""}
            placeholder="https://g.page/r/…/review"
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-stone-500">
            Renseigné, il est envoyé par e-mail le lendemain du repas pour demander un avis. Sur Google : fiche
            d&apos;établissement → « Demander des avis » → copier le lien.
          </span>
        </label>
      </section>

      <section className={cardClass}>
        <h2 className="font-semibold">Horaires de réservation</h2>
        <p className="mb-3 text-sm text-stone-500">
          Pour chaque service : première et dernière heure d&apos;arrivée possibles.
        </p>
        <HoursEditor value={hours} onChange={setHours} />
      </section>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50">
          {pending ? "Enregistrement…" : "Enregistrer les réglages"}
        </button>
        {result === "ok" && !pending && <span className="text-sm text-emerald-700">Réglages enregistrés ✓</span>}
        {result && result !== "ok" && <span className="text-sm text-red-700">{result}</span>}
      </div>
    </form>
  );
}
