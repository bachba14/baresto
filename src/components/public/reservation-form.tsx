"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/format";
import type { CalendarLinks } from "@/lib/calendar";
import { CalendarButtons } from "./calendar-buttons";
import { WaitlistForm } from "./waitlist-form";

type Slot = { time: string; remaining: number };

const input =
  "w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 dark:border-stone-600";
const label = "mb-1 block text-sm font-medium";

export function ReservationForm(props: {
  minDate: string;
  maxDate: string;
  maxPartySize: number;
  autoConfirm: boolean;
  message: string | null;
  phone: string | null;
  frameId: string;
  /** Base de l'API du restaurant, ex. "/api/r/le-comptoir". */
  apiBase: string;
  /** Délai de modification / annulation en ligne, en heures. */
  cancelHours: number;
  /** Valeurs pré-remplies (ex. lien de l'e-mail de liste d'attente). */
  initialDate?: string;
  initialParty?: number;
}) {
  const [date, setDate] = useState(
    props.initialDate && props.initialDate >= props.minDate && props.initialDate <= props.maxDate ? props.initialDate : props.minDate,
  );
  const [party, setParty] = useState(
    props.initialParty && props.initialParty >= 1 && props.initialParty <= props.maxPartySize ? props.initialParty : 2,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ status: string; date: string; time: string; party: number; manageUrl?: string; calendar?: CalendarLinks } | null>(null);
  const [reload, setReload] = useState(0);
  const [waitlist, setWaitlist] = useState(false);

  // Créneaux et horaire choisi sont liés à une requête (date + rechargement) :
  // une nouvelle requête les invalide automatiquement.
  const key = `${date}#${party}#${reload}`;
  const [loaded, setLoaded] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [picked, setPicked] = useState<{ key: string; time: string } | null>(null);
  const slots = loaded?.key === key ? loaded.slots : null;
  const time = picked?.key === key ? picked.time : null;
  const setTime = (t: string) => setPicked({ key, time: t });

  useEffect(() => {
    let cancelled = false;
    fetch(`${props.apiBase}/availability?date=${date}&party=${party}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setLoaded({ key, slots: d.slots ?? [] }))
      .catch(() => !cancelled && setLoaded({ key, slots: [] }));
    return () => {
      cancelled = true;
    };
  }, [date, party, key, props.apiBase]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!time) return setError("Choisissez un horaire.");
    setSubmitting(true);
    setError(null);

    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`${props.apiBase}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date, time, party_size: party }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        // Le créneau a pu se remplir entre-temps : on recharge.
        if (res.status === 409) setReload((r) => r + 1);
        return;
      }
      setDone({ status: data.status, date, time, party, manageUrl: data.manage_url, calendar: data.calendar });
      window.parent?.postMessage(
        { type: "baresto:reservation", frameId: props.frameId, status: data.status, date, time, partySize: party },
        "*",
      );
    } catch {
      setError("Connexion impossible, réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-5 text-center">
        <p className="text-3xl">✓</p>
        <h2 className="mt-2 text-lg font-semibold">
          {done.status === "confirmed" ? "Réservation confirmée !" : "Demande envoyée !"}
        </h2>
        <p className="mt-1 text-sm">
          {done.party} {done.party > 1 ? "personnes" : "personne"}, {formatDate(done.date)} à {formatTime(done.time)}
        </p>
        {done.status !== "confirmed" && (
          <p className="mt-2 text-sm text-stone-500">Le restaurant va confirmer votre réservation rapidement.</p>
        )}
        {done.calendar && <CalendarButtons links={done.calendar} className="mt-4" center />}
        {done.manageUrl && (
          <p className="mt-3 text-sm">
            <a href={done.manageUrl} target="_blank" rel="noreferrer" className="text-[var(--brand)] underline">
              Modifier ou annuler
            </a>
            <span className="text-stone-500"> (jusqu&apos;à {props.cancelHours} h avant, lien aussi envoyé par e-mail)</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setDone(null);
            setReload((r) => r + 1);
          }}
          className="mt-4 text-sm text-[var(--brand)] underline"
        >
          Faire une autre réservation
        </button>
      </div>
    );
  }

  const available = slots?.filter((s) => s.remaining >= party) ?? [];
  // Liste d'attente : seulement si le restaurant ouvre ce jour-là et qu'au moins un créneau est complet.
  const canWait = !!slots && slots.length > 0 && available.length < slots.length;

  if (waitlist && slots) {
    return (
      <WaitlistForm
        apiBase={props.apiBase}
        date={date}
        party={party}
        times={slots.map((s) => s.time)}
        onCancel={() => setWaitlist(false)}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {props.message && (
        <p className="rounded-lg bg-stone-100 p-3 text-sm dark:bg-stone-800">{props.message}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="b-party">Personnes</label>
          <select id="b-party" className={input} value={party} onChange={(e) => setParty(Number(e.target.value))}>
            {Array.from({ length: props.maxPartySize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="b-date">Date</label>
          <input
            id="b-date"
            type="date"
            className={input}
            value={date}
            min={props.minDate}
            max={props.maxDate}
            onChange={(e) => {
              if (!e.target.value) return;
              setDate(e.target.value);
              setError(null);
            }}
            required
          />
        </div>
      </div>

      <div>
        <span className={label}>Horaire</span>
        {slots === null ? (
          <p className="text-sm text-stone-500">Chargement des disponibilités…</p>
        ) : available.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-500">
              {canWait ? "Complet ce jour-là." : "Aucun créneau disponible ce jour-là."} Essayez une autre date
              {props.phone ? <> ou appelez-nous au {props.phone}</> : null}.
            </p>
            {canWait && (
              <button
                type="button"
                onClick={() => setWaitlist(true)}
                className="w-full rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/5"
              >
                Être prévenu si une table se libère
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((s) => {
              const full = s.remaining < party;
              const selected = time === s.time;
              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={full}
                  onClick={() => setTime(s.time)}
                  className={`rounded-lg border px-2 py-2 text-sm transition ${
                    selected
                      ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                      : "border-stone-300 hover:border-[var(--brand)] dark:border-stone-600"
                  } disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through`}
                >
                  {formatTime(s.time)}
                </button>
              );
            })}
            {canWait && (
              <button
                type="button"
                onClick={() => setWaitlist(true)}
                className="col-span-full text-left text-xs text-stone-500 underline hover:text-[var(--brand)]"
              >
                L&apos;horaire voulu est complet ? Rejoindre la liste d&apos;attente
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {(slots === null || available.length > 0) && (
        <>
          <div>
            <label className={label} htmlFor="b-name">Nom</label>
            <input id="b-name" name="name" className={input} required minLength={2} maxLength={120} autoComplete="name" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="b-email">E-mail</label>
              <input id="b-email" name="email" type="email" className={input} maxLength={200} autoComplete="email" />
            </div>
            <div>
              <label className={label} htmlFor="b-phone">Téléphone</label>
              <input id="b-phone" name="phone" type="tel" className={input} maxLength={40} autoComplete="tel" />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="b-notes">Remarques (allergies, occasion…)</label>
            <textarea id="b-notes" name="notes" rows={2} className={input} maxLength={1000} />
          </div>
          {/* Champ piège anti-robots, invisible pour les humains */}
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

          <button
            type="submit"
            disabled={submitting || !time}
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting
              ? "Envoi…"
              : time
                ? `${props.autoConfirm ? "Réserver" : "Demander"} pour ${party} · ${formatTime(time)}`
                : "Choisissez un horaire"}
          </button>
        </>
      )}
    </form>
  );
}
