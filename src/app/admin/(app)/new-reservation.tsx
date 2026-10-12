"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass } from "@/components/admin-styles";
import { toast } from "@/components/toaster";
import { formatTime } from "@/lib/format";
import {
  daySlots,
  quickCreateReservation,
  searchCustomers,
  tableOptions,
  type CustomerHit,
  type SlotInfo,
  type TableOption,
} from "./new-reservation-actions";

const OPEN_EVENT = "monkomi:new-reservation";

/** Ouvre le panneau « Nouvelle réservation » depuis n'importe quel composant client. */
export function openNewReservation(date?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { date } }));
}

/** Bouton qui ouvre le panneau (utilisable dans une page serveur). */
export function NewReservationButton({ className = "", date, children = "+ Réservation" }: { className?: string; date?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => openNewReservation(date)} className={className}>
      {children}
    </button>
  );
}

/**
 * Panneau latéral de saisie d'une réservation (téléphone, sur place), accessible depuis toutes les pages
 * (bouton du menu, raccourci « N »). Après l'enregistrement : notification, on reste sur la page.
 */
export function NewReservationPanel({ today }: { today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [party, setParty] = useState(2);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [known, setKnown] = useState<CustomerHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  const reset = (d = today) => {
    setDate(d);
    setParty(2);
    setTime("");
    setTableId("");
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setKnown(null);
    setHits([]);
    setError(null);
  };

  // Ouverture : bouton, événement, raccourci « N » (hors champ de saisie). Fermeture : Échap.
  useEffect(() => {
    const onOpen = (e: Event) => {
      reset((e as CustomEvent<{ date?: string }>).detail?.date ?? today);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "Escape") setOpen(false);
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        reset();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  useEffect(() => {
    if (open) setTimeout(() => first.current?.focus(), 50);
  }, [open]);

  // Créneaux de la date choisie.
  useEffect(() => {
    if (!open) return;
    let stale = false;
    daySlots(date).then((s) => !stale && setSlots(s));
    return () => {
      stale = true;
    };
  }, [open, date]);

  // Tables libres pour l'horaire choisi, avec la table suggérée présélectionnée.
  useEffect(() => {
    if (!open || !time) return;
    let stale = false;
    tableOptions(date, time, party).then((r) => {
      if (stale) return;
      setTables(r.tables);
      setSuggested(r.suggested);
      setTableId(r.suggested ?? "");
    });
    return () => {
      stale = true;
    };
  }, [open, date, time, party]);

  // Autocomplétion sur le nom ou le téléphone.
  const lookup = (q: string) => {
    setKnown(null);
    if (q.trim().length < 2) return setHits([]);
    searchCustomers(q).then(setHits);
  };

  const pick = (c: CustomerHit) => {
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setKnown(c);
    setHits([]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return setError("Choisissez un créneau ou une heure.");
    if (!phone.trim() && !email.trim()) return setError("Indiquez un téléphone ou un e-mail pour pouvoir joindre le client.");
    setError(null);
    startTransition(async () => {
      const result = await quickCreateReservation({ date, time, party, name, phone, email, notes, tableId: tableId || null, sendEmail });
      if (!result.ok) return setError(result.error);
      setOpen(false);
      toast(result.message, { tone: "success" });
      router.refresh();
    });
  };

  if (!open) return null;

  const contactMissing = !phone.trim() && !email.trim() && name.trim().length > 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="new-res-title">
      <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]" />
      <form
        onSubmit={submit}
        className="animate-rise relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl sm:rounded-l-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4">
          <h2 id="new-res-title" className="text-lg">Nouvelle réservation</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">✕</button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>Date</span>
              <input ref={first} type="date" value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setTime(""); } }} required className={inputClass} />
            </label>
            <div>
              <span className={labelClass}>Couverts</span>
              <div className="flex h-[38px] items-center rounded-lg border border-stone-200">
                <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} aria-label="Une personne de moins" className="h-full w-11 text-lg text-stone-600 hover:bg-stone-50">−</button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={party}
                  onChange={(e) => setParty(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                  aria-label="Nombre de couverts"
                  className="w-full min-w-0 border-x border-stone-200 text-center text-sm outline-none"
                />
                <button type="button" onClick={() => setParty((p) => Math.min(100, p + 1))} aria-label="Une personne de plus" className="h-full w-11 text-lg text-stone-600 hover:bg-stone-50">+</button>
              </div>
            </div>
          </div>

          <div>
            <span className={labelClass}>Créneau</span>
            {slots === null ? (
              <p className="text-sm text-stone-500">Chargement…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-stone-500">Pas de service ce jour-là d&apos;après vos horaires : indiquez l&apos;heure ci-dessous.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => {
                  const full = s.remaining < party;
                  const disabled = s.past || s.closed;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTime(s.time)}
                      title={s.closed ? "Fermé" : s.past ? "Créneau passé" : `${Math.max(0, s.remaining)} couverts restants`}
                      className={`flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 py-1 text-sm transition ${
                        time === s.time
                          ? "border-stone-900 bg-stone-900 text-white"
                          : full
                            ? "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400"
                            : "border-stone-200 hover:border-stone-400"
                      } disabled:cursor-not-allowed disabled:opacity-35`}
                    >
                      <span className="font-medium">{formatTime(s.time)}</span>
                      <span className={`text-[10px] ${time === s.time ? "text-white/70" : "text-stone-500"}`}>
                        {s.closed ? "fermé" : full ? "complet" : `${s.remaining} pl.`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <label className="mt-2 flex items-center gap-2 text-sm whitespace-nowrap text-stone-600">
              Autre heure
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} w-auto py-1.5`} />
            </label>
          </div>

          {time && tables.length > 0 && (
            <label className="block">
              <span className={labelClass}>Table</span>
              <select value={tableId} onChange={(e) => setTableId(e.target.value)} className={inputClass}>
                <option value="">Automatique (meilleure table libre)</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id} disabled={!t.free}>
                    {t.label} · {t.seats} places{t.id === suggested ? " · suggérée" : ""}{t.free ? "" : " · occupée"}
                  </option>
                ))}
              </select>
              {!suggested && <span className="mt-1 block text-xs text-amber-700">Aucune table libre adaptée : la réservation sera « sans table ».</span>}
            </label>
          )}

          <div className="relative">
            <label className="block">
              <span className={labelClass}>Nom</span>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); lookup(e.target.value); }}
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
                className={inputClass}
              />
            </label>
            {known && (
              <p className="mt-1 text-xs">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                  {known.reservations >= 3 ? `Habitué · ${known.reservations} résa` : `${known.reservations} résa`}
                </span>
                {known.noShows > 0 && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">⚠ {known.noShows} no-show</span>}
              </p>
            )}
            {hits.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-stone-900/10" role="listbox">
                {hits.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => pick(c)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-stone-500">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>
                      </span>
                      {c.reservations >= 3 && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Habitué</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block">
            <span className={labelClass}>Téléphone</span>
            <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (e.target.value.replace(/\D/g, "").length >= 4) lookup(e.target.value); }} maxLength={40} autoComplete="off" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} className={inputClass} />
          </label>
          {contactMissing && <p className="-mt-3 text-xs text-amber-700">Un téléphone ou un e-mail est nécessaire pour joindre le client.</p>}
          <label className="block">
            <span className={labelClass}>Remarques</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="Allergie, anniversaire, chaise haute…" className={inputClass} />
          </label>
          {email.trim() && (
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Envoyer la confirmation par e-mail
            </label>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-stone-100 bg-white px-5 py-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50">
            {pending ? "Enregistrement…" : time ? `Enregistrer · ${party} pers. à ${formatTime(time)}` : "Enregistrer la réservation"}
          </button>
          <p className="mt-2 text-center text-xs text-stone-500">Raccourci : touche N pour ouvrir ce panneau</p>
        </div>
      </form>
    </div>
  );
}
