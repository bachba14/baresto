"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cardClass, inputClass, labelClass } from "@/components/admin-styles";
import { HoursEditor } from "@/components/hours-editor";
import { toast } from "@/components/toaster";
import type { OpeningHours, Restaurant } from "@/lib/types";
import { saveSettings } from "./actions";

const TAGLINE_MAX = 120;

export function SettingsForm({ restaurant: settings, tableCount }: { restaurant: Restaurant; tableCount: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [autoConfirm, setAutoConfirm] = useState(settings.auto_confirm);
  const [dirty, setDirty] = useState(false);
  // Enregistrement : notification et fin de l'état « modifié » dès la réponse du serveur.
  const [, action, pending] = useActionState(async (prev: string | null, formData: FormData) => {
    const result = await saveSettings(prev, formData);
    if (result === "ok") {
      setDirty(false);
      toast("Réglages enregistrés", { tone: "success" });
    } else if (result) toast(result, { tone: "error" });
    return result;
  }, null);
  const [hours, setHours] = useState<OpeningHours>(settings.opening_hours ?? {});
  const [color, setColor] = useState(settings.primary_color);
  const [tagline, setTagline] = useState(settings.tagline ?? "");

  // Avertissement si l'on quitte la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const discard = () => {
    formRef.current?.reset();
    setAutoConfirm(settings.auto_confirm);
    setHours(settings.opening_hours ?? {});
    setColor(settings.primary_color);
    setTagline(settings.tagline ?? "");
    setDirty(false);
  };

  /** Champ avec, si besoin, son unité affichée dans le champ (min, h, jours…). */
  const field = (name: keyof Restaurant, label: string, props: React.ComponentProps<"input"> = {}, unit?: string) => (
    <label>
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        <input name={name} defaultValue={String(settings[name] ?? "")} className={`${inputClass} ${unit ? "pr-14" : ""}`} {...props} />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-500">{unit}</span>}
      </span>
    </label>
  );

  return (
    <form ref={formRef} action={action} onChange={() => setDirty(true)} className="space-y-6 pb-20">
      <input type="hidden" name="opening_hours" value={JSON.stringify(hours)} />

      <section id="etablissement" className={`${cardClass} grid scroll-mt-20 gap-4 sm:grid-cols-2`}>
        <h2 className="font-semibold sm:col-span-2">Établissement</h2>
        {field("name", "Nom", { required: true })}
        <label>
          <span className="mb-1 flex items-baseline justify-between">
            <span className={labelClass}>Accroche</span>
            <span className={`text-xs tabular-nums ${tagline.length > TAGLINE_MAX - 10 ? "text-amber-700" : "text-stone-500"}`}>
              {tagline.length} / {TAGLINE_MAX}
            </span>
          </span>
          <input
            name="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={TAGLINE_MAX}
            placeholder={`Ex. Cuisine de saison au cœur de ${settings.city || "votre ville"}`}
            className={inputClass}
          />
        </label>
        {/* Aperçu de l'en-tête de la page publique */}
        <div className="overflow-hidden rounded-xl bg-stone-900 px-5 py-4 text-white sm:col-span-2" aria-label="Aperçu de votre page publique">
          <p className="text-[11px] tracking-wider text-white/60 uppercase">Aperçu de votre page publique</p>
          <p className="mt-1 text-xl font-bold">{settings.name}</p>
          <p className="text-sm text-white/80">{tagline || <span className="text-white/40">Votre accroche apparaîtra ici</span>}</p>
        </div>
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

      <section id="reservations-en-ligne" className={`${cardClass} grid scroll-mt-20 gap-4 sm:grid-cols-3`}>
        <h2 className="font-semibold sm:col-span-3">Réservations en ligne</h2>
        {field("max_covers_per_slot", "Couverts max par créneau", { type: "number", min: 1 }, "couv.")}
        {field("max_party_size", "Taille de groupe max", { type: "number", min: 1 }, "pers.")}
        {field("slot_minutes", "Intervalle des créneaux", { type: "number", min: 5, step: 5 }, "min")}
        {field("booking_days_ahead", "Réservable jusqu'à", { type: "number", min: 0 }, "jours")}
        {field("min_notice_minutes", "Délai minimum avant réservation", { type: "number", min: 0 }, "min")}
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
        {field("lunch_minutes", "Durée d’un repas le midi", { type: "number", min: 15, step: 15 }, "min")}
        {field("dinner_minutes", "Durée d’un repas le soir", { type: "number", min: 15, step: 15 }, "min")}
        {field("dinner_from", "Le service du soir commence à", { type: "time" })}
        <label className="sm:col-span-3">
          <span className={labelClass}>Message affiché sur le formulaire</span>
          <textarea name="reservation_message" rows={2} defaultValue={settings.reservation_message ?? ""} placeholder="Ex. : au-delà de 8 personnes, appelez-nous." className={inputClass} />
        </label>
      </section>

      <section id="e-mails" className={`${cardClass} grid scroll-mt-20 gap-4`}>
        <div>
          <h2 className="font-semibold">E-mails aux clients</h2>
          <p className="text-sm text-stone-500">
            Chaque client qui laisse son e-mail reçoit une confirmation avec un lien pour modifier ou annuler en ligne, jusqu&apos;au délai choisi ci-dessous. Les nouvelles réservations vous sont signalées à l&apos;adresse e-mail de l&apos;établissement ci-dessus.
          </p>
        </div>
        <div className="max-w-xs">
          {field("cancel_deadline_hours", "Modification / annulation en ligne jusqu'à", { type: "number", min: 0, max: 168 }, "h avant")}
          <span className="mt-1 block text-xs text-stone-500">24 h par défaut. 0 = jusqu&apos;à l&apos;heure du repas.</span>
        </div>
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

      <section id="horaires" className={`${cardClass} scroll-mt-20`}>
        <h2 className="font-semibold">Horaires de réservation</h2>
        <p className="mb-3 text-sm text-stone-500">
          Pour chaque service : première et dernière heure d&apos;arrivée possibles.
        </p>
        <HoursEditor
          value={hours}
          onChange={(h) => {
            setHours(h);
            setDirty(true);
          }}
        />
      </section>

      {/* Barre d'enregistrement fixe : visible dès qu'un champ change */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:left-64 ${dirty || pending ? "translate-y-0" : "translate-y-full"}`}
        aria-hidden={!dirty && !pending}
      >
        <div className="flex items-center gap-3 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)] backdrop-blur md:rounded-t-2xl md:border-x">
          <span className="flex-1 text-sm text-amber-800">● Modifications non enregistrées</span>
          <button type="button" onClick={discard} disabled={pending} className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100">
            Annuler
          </button>
          <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50">
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
}
