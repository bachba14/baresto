"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toaster";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "./push-actions";

const OPEN_EVENT = "monkomi:notifications";
const NUDGE_KEY = "monkomi-notifications-nudge";
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Ouvre le panneau des notifications (menu, bandeau du tableau de bord). */
export function openNotifications() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type PushState =
  | "loading"
  /** Navigateur sans notifications. */
  | "unsupported"
  /** iPhone / iPad : notifications seulement une fois Monkomi ajouté à l'écran d'accueil. */
  | "ios-install"
  /** Clés VAPID absentes du serveur. */
  | "unconfigured"
  /** Permission refusée : à rétablir dans les réglages du navigateur. */
  | "denied"
  | "off"
  | "on";

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/** État des notifications sur cet appareil. */
function usePushState() {
  const [state, setState] = useState<PushState>("loading");

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
    }
    if (!VAPID_KEY) return setState("unconfigured");
    if (Notification.permission === "denied") return setState("denied");
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    // Lecture d'API du navigateur, impossible pendant le rendu serveur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { state, setState, refresh };
}

/** Invite d'installation d'Android / Chrome, gardée pour un bouton « Installer l'application ». */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return prompt;
}

const primary = "rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50";
const secondary = "rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-50";

/** Panneau des notifications, monté une fois dans le layout du back-office. */
export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { state, setState, refresh } = usePushState();
  const install = useInstallPrompt();

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      void refresh();
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) });
      const error = await savePushSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
      if (error) {
        await sub.unsubscribe();
        return toast(error, { tone: "error" });
      }
      setState("on");
      const testError = await sendTestPush();
      toast(testError ?? "Notifications activées : une notification de test arrive.", { tone: testError ? "error" : "success" });
    } catch {
      toast("Activation impossible sur cet appareil.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast("Notifications désactivées sur cet appareil.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    const error = await sendTestPush();
    setBusy(false);
    toast(error ?? "Notification de test envoyée.", { tone: error ? "error" : "success" });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30 p-4 sm:items-center" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="notifications-title" className="text-lg">🔔 Notifications sur cet appareil</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg px-2 text-stone-500 hover:bg-stone-100">✕</button>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Soyez prévenu à chaque nouvelle réservation en ligne, et quand un client modifie ou annule la sienne.
        </p>

        <div className="mt-5 space-y-3 text-sm">
          {state === "loading" && <p className="text-stone-500">Vérification…</p>}

          {state === "on" && (
            <>
              <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">✓ Activées sur cet appareil.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={test} className={primary}>Envoyer un test</button>
                <button type="button" disabled={busy} onClick={disable} className={secondary}>Désactiver</button>
              </div>
            </>
          )}

          {state === "off" && (
            <>
              <p className="text-stone-600">Votre navigateur va vous demander l&apos;autorisation : choisissez « Autoriser ».</p>
              <button type="button" disabled={busy} onClick={enable} className={primary}>{busy ? "Activation…" : "Activer les notifications"}</button>
            </>
          )}

          {state === "ios-install" && (
            <div className="space-y-2 text-stone-700">
              <p>Sur iPhone et iPad, les notifications fonctionnent une fois Monkomi installé sur l&apos;écran d&apos;accueil :</p>
              <ol className="ml-5 list-decimal space-y-1">
                <li>Ouvrez cette page dans <strong>Safari</strong>.</li>
                <li>Touchez le bouton <strong>Partager</strong> (le carré avec une flèche vers le haut).</li>
                <li>Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong>, puis <strong>Ajouter</strong>.</li>
                <li>Ouvrez Monkomi depuis l&apos;icône, puis revenez ici : le bouton « Activer » apparaîtra.</li>
              </ol>
              <p className="text-xs text-stone-500">Il faut iOS 16.4 ou plus récent (Réglages → Général → Mise à jour logicielle).</p>
            </div>
          )}

          {state === "denied" && (
            <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
              Les notifications ont été refusées pour Monkomi sur cet appareil. Autorisez-les dans les réglages du navigateur
              (icône à gauche de l&apos;adresse, ou Réglages → Notifications sur téléphone), puis rouvrez ce panneau.
            </p>
          )}

          {state === "unsupported" && (
            <p className="text-stone-600">Ce navigateur ne permet pas les notifications. Essayez avec Chrome, Edge, Firefox ou Safari à jour.</p>
          )}

          {state === "unconfigured" && (
            <p className="text-stone-600">Les notifications ne sont pas encore configurées sur le serveur.</p>
          )}
        </div>

        {install && (
          <div className="mt-5 border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-600">Installez Monkomi comme une application : une icône sur votre écran, ouverture en plein écran.</p>
            <button
              type="button"
              onClick={async () => {
                await install.prompt();
                await install.userChoice;
              }}
              className={`${secondary} mt-2 ring-1 ring-stone-200`}
            >
              📲 Installer l&apos;application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Bandeau du tableau de bord tant que les notifications ne sont pas activées sur cet appareil (masquable). */
export function NotificationsNudge() {
  const { state } = usePushState();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(NUDGE_KEY) === "1";
    } catch {}
    // Préférence lue dans le navigateur, après le rendu serveur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(dismissed);
  }, []);

  if (hidden || (state !== "off" && state !== "ios-install")) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(NUDGE_KEY, "1");
    } catch {}
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
      <span className="text-lg" aria-hidden>🔔</span>
      <p className="min-w-0 flex-1 text-amber-900">Recevez chaque nouvelle réservation directement sur ce téléphone ou cet ordinateur.</p>
      <button type="button" onClick={openNotifications} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700">
        Activer
      </button>
      <button type="button" onClick={dismiss} aria-label="Masquer" className="rounded-lg px-2 py-1 text-amber-800 hover:bg-amber-100">✕</button>
    </div>
  );
}
