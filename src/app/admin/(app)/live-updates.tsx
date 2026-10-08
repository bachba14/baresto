"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { formatTime } from "@/lib/format";
import type { Reservation } from "@/lib/types";

/** Petit « ding » quand une réservation arrive (ignoré si le navigateur bloque le son). */
function ding() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Son indisponible
  }
}

/**
 * Met à jour le back-office en direct : toute nouvelle réservation, modification ou annulation
 * (widget, client, autre appareil de l'équipe) rafraîchit la page affichée, sans recharger.
 */
export function LiveUpdates({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const filter = `restaurant_id=eq.${restaurantId}`;
    let channel: RealtimeChannel | null = null;
    let stopped = false;

    // Plusieurs événements rapprochés (réservation + tables) → un seul rafraîchissement.
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 300);
    };
    const toast = (text: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (stopped) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      // Le client navigateur est partagé : un nom de canal unique évite de reprendre
      // un canal en cours de fermeture (double montage en dev, navigation).
      channel = supabase
        .channel(`restaurant-${restaurantId}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations", filter }, (payload) => {
          const r = payload.new as Reservation;
          if (r.source === "widget") {
            toast(`Nouvelle réservation : ${r.name}, ${r.party_size} pers., le ${r.date.slice(8, 10)}/${r.date.slice(5, 7)} à ${formatTime(r.time)}`);
            ding();
          }
          refresh();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reservations", filter }, refresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservation_tables", filter }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "waitlist", filter }, refresh)
        .subscribe((status, err) => {
          setConnected(status === "SUBSCRIBED");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[direct]", status, err?.message ?? "");
        });
    })();

    // Retour sur l'onglet (tablette en veille…) : on se remet à jour.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [restaurantId, router]);

  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-stone-500" title={connected ? "Mises à jour en direct" : "Connexion au direct…"}>
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-stone-300"}`} />
        {connected ? "En direct" : "Hors ligne"}
      </p>
      <div className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-xl border border-emerald-200 bg-white p-3 text-sm shadow-lg">
            🔔 {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
