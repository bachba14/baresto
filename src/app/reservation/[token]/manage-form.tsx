"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/format";
import { cancelReservation, loadSlots, modifyReservation } from "./actions";

const input =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20";
const label = "mb-1 block text-sm font-medium";

type Slot = { time: string; remaining: number };

export function ManageForm(props: {
  token: string;
  date: string;
  time: string;
  party: number;
  minDate: string;
  maxDate: string;
  maxPartySize: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "modify" | "cancel">("idle");
  const [date, setDate] = useState(props.date);
  const [party, setParty] = useState(props.party);
  const [time, setTime] = useState<string | null>(props.time.slice(0, 5));
  const [loaded, setLoaded] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const key = `${date}#${party}`;
  const slots = loaded?.key === key ? loaded.slots : null;

  useEffect(() => {
    if (mode !== "modify") return;
    let cancelled = false;
    loadSlots(props.token, date, party).then((s) => !cancelled && setLoaded({ key, slots: s }));
    return () => {
      cancelled = true;
    };
  }, [mode, date, party, key, props.token]);

  const submit = (fn: () => Promise<string | null>) =>
    startTransition(async () => {
      setError(null);
      const err = await fn();
      if (err) return setError(err);
      setMode("idle");
      router.refresh();
    });

  if (mode === "cancel") {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-800">Annuler cette réservation ?</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() => submit(() => cancelReservation(props.token))}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Annulation…" : "Oui, annuler"}
          </button>
          <button onClick={() => setMode("idle")} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-white">
            Non, garder ma table
          </button>
        </div>
      </div>
    );
  }

  if (mode === "modify") {
    const unchanged = date === props.date && party === props.party && time === props.time.slice(0, 5);
    return (
      <form
        className="space-y-4 rounded-xl border border-stone-200 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (time) submit(() => modifyReservation(props.token, date, time, party));
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="m-party">Personnes</label>
            <select id="m-party" className={input} value={party} onChange={(e) => { setParty(Number(e.target.value)); setTime(null); }}>
              {Array.from({ length: props.maxPartySize }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="m-date">Date</label>
            <input
              id="m-date"
              type="date"
              className={input}
              value={date}
              min={props.minDate}
              max={props.maxDate}
              onChange={(e) => { if (e.target.value) { setDate(e.target.value); setTime(null); } }}
            />
          </div>
        </div>
        <div>
          <span className={label}>Horaire</span>
          {slots === null ? (
            <p className="text-sm text-stone-500">Chargement des disponibilités…</p>
          ) : slots.filter((s) => s.remaining >= party).length === 0 ? (
            <p className="text-sm text-stone-500">Aucun créneau disponible ce jour-là.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  disabled={s.remaining < party}
                  onClick={() => setTime(s.time)}
                  className={`rounded-lg border px-2 py-2 text-sm ${
                    time === s.time ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-stone-300 hover:border-[var(--brand)]"
                  } disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through`}
                >
                  {formatTime(s.time)}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pending || !time || unchanged}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : "Enregistrer la modification"}
          </button>
          <button type="button" onClick={() => setMode("idle")} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">
            Retour
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setMode("modify")}
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Modifier
      </button>
      <button onClick={() => setMode("cancel")} className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50">
        Annuler la réservation
      </button>
    </div>
  );
}
