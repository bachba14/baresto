// Envoi d'e-mails transactionnels via l'API HTTP de Brevo (300 e-mails/jour gratuits)
// ou de Resend (3 000/mois gratuits). Sans clé configurée, les e-mails sont ignorés.

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
  return Boolean(sender() && (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY));
}

/** Envoie un e-mail. Ne lève jamais d'erreur : renvoie false en cas d'échec. */
export async function sendEmail(email: Email): Promise<boolean> {
  const from = sender();
  if (!from || !email.to) return false;
  const fromName = email.fromName.replace(/["<>]/g, "");

  try {
    let res: Response;
    if (process.env.BREVO_API_KEY) {
      res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: { name: fromName, email: from },
          to: [{ email: email.to, ...(email.toName ? { name: email.toName } : {}) }],
          ...(email.replyTo ? { replyTo: { email: email.replyTo } } : {}),
          subject: email.subject,
          htmlContent: email.html,
        }),
      });
    } else if (process.env.RESEND_API_KEY) {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${fromName} <${from}>`,
          to: [email.to],
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
          subject: email.subject,
          html: email.html,
        }),
      });
    } else {
      return false;
    }
    if (!res.ok) console.error("[email]", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[email]", e);
    return false;
  }
}
