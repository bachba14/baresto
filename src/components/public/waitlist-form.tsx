"use client";

import { useState } from "react";
import { formatDate, formatTime } from "@/lib/format";

const input =
  "w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 dark:border-stone-600";
const label = "mb-1 block text-sm font-medium";

/** Inscription sur liste d'attente quand les créneaux d'une date sont complets. */
export function WaitlistForm(props: {
  apiBase: string;
  date: string;
  party: number;
  /** Horaires du jour (complets ou non), pour indiquer une préférence. */
  times: string[];
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`${props.apiBase}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: props.date, party_size: props.party }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Une erreur est survenue.");
      setDone(true);
    } catch {
      setError("Connexion impossible, réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4 text-sm">
        <p className="font-semibold">Vous êtes sur la liste d&apos;attente ✓</p>
        <p className="mt-1">Nous vous écrirons dès qu&apos;une table se libère le {formatDate(props.date)}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <div>
        <p className="font-semibold">Liste d&apos;attente</p>
        <p className="text-sm text-stone-500">
          {props.party} {props.party > 1 ? "personnes" : "personne"}, {formatDate(props.date)}. Vous recevrez un e-mail dès
          qu&apos;une table se libère.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="w-name">Nom</label>
          <input id="w-name" name="name" className={input} required minLength={2} maxLength={120} autoComplete="name" />
        </div>
        <div>
          <label className={label} htmlFor="w-email">E-mail</label>
          <input id="w-email" name="email" type="email" className={input} required maxLength={200} autoComplete="email" />
        </div>
        <div>
          <label className={label} htmlFor="w-phone">Téléphone (facultatif)</label>
          <input id="w-phone" name="phone" type="tel" className={input} maxLength={40} autoComplete="tel" />
        </div>
        <div>
          <label className={label} htmlFor="w-time">Horaire souhaité</label>
          <select id="w-time" name="time" className={input} defaultValue="">
            <option value="">Peu importe</option>
            {props.times.map((t) => (
              <option key={t} value={t}>vers {formatTime(t)}</option>
            ))}
          </select>
        </div>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Envoi…" : "M'inscrire"}
        </button>
        <button type="button" onClick={props.onCancel} className="text-sm text-stone-500 underline">Retour</button>
      </div>
    </form>
  );
}
