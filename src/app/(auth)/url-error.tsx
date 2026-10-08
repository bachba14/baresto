"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  oauth: "Connexion avec Google annulée ou refusée.",
  link: "Ce lien est invalide ou a expiré. Reconnectez-vous ou demandez un nouveau lien.",
};

function Message() {
  const code = useSearchParams().get("error");
  const message = code ? MESSAGES[code] : null;
  return message ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p> : null;
}

/** Affiche l'erreur transmise dans l'URL (?error=…) après un retour de Google ou d'un lien e-mail. */
export function UrlError() {
  return (
    <Suspense>
      <Message />
    </Suspense>
  );
}
