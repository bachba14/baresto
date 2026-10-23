// Envoi d'e-mails transactionnels via l'API HTTP de Resend (3 000 e-mails/mois et 100/jour gratuits).
// Sans clé configurée, les e-mails sont ignorés.

export type Email = {
  to: string;
  toName?: string;
  /** Nom d'expéditeur affiché, ex. « Le Comptoir ». L'adresse reste EMAIL_FROM. */
  fromName: string;
  replyTo?: string | null;
  subject: string;
  html: string;
};

function sender() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return null;
  // Accepte « adresse » ou « Nom <adresse> » : seule l'adresse est gardée.
  return from.match(/<([^>]+)>/)?.[1] ?? from;
}

export function emailEnabled() {
  return Boolean(sender() && process.env.RESEND_API_KEY);
}

/** Envoie un e-mail. Ne lève jamais d'erreur : renvoie false en cas d'échec. */
export async function sendEmail(email: Email): Promise<boolean> {
  const from = sender();
  const key = process.env.RESEND_API_KEY;
  if (!from || !key || !email.to) return false;
  const fromName = email.fromName.replace(/["<>]/g, "");
  const to = email.toName ? `${email.toName.replace(/["<>]/g, "")} <${email.to}>` : email.to;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${from}>`,
        to: [to],
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        subject: email.subject,
        html: email.html,
      }),
    });
    if (!res.ok) console.error("[email]", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[email]", e);
    return false;
  }
}
