/** Remplace le formulaire de réservation pendant une pause des réservations en ligne. */
export function OnlineClosed({ phone, resumeAt, timezone }: { phone: string | null; resumeAt: string | null; timezone: string }) {
  const until = resumeAt
    ? new Date(resumeAt).toLocaleString("fr-FR", { timeZone: timezone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <div className="rounded-xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-medium">Les réservations en ligne sont momentanément fermées.</p>
      {until && <p className="mt-1 text-sm">Elles rouvrent {until}.</p>}
      {phone ? (
        <p className="mt-3 text-sm">
          Pour réserver, appelez-nous au{" "}
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-semibold underline">{phone}</a>.
        </p>
      ) : (
        <p className="mt-3 text-sm">Merci de contacter directement le restaurant.</p>
      )}
    </div>
  );
}
