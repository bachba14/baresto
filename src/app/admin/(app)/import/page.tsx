import { cardClass } from "@/components/admin-styles";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer réservations et clients</h1>
        <p className="text-stone-500">
          Vous venez d&apos;un autre logiciel ou d&apos;un cahier ? Récupérez votre historique et vos réservations à venir en
          quelques minutes.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="font-semibold">1. Téléchargez le modèle Excel</h2>
        <p className="mt-1 text-sm text-stone-500">
          Une feuille « Réservations » et une feuille « Clients » à remplir, avec un mode d&apos;emploi. Vous pouvez aussi
          envoyer directement l&apos;export Excel ou CSV d&apos;un autre logiciel : les colonnes Date, Heure, Couverts (ou
          Personnes), Nom, Téléphone, E-mail, Remarques sont reconnues.
        </p>
        <a
          href="/admin/import/modele"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
        >
          ⬇ Télécharger le modèle Excel
        </a>
      </section>

      <ImportForm />

      <p className="text-xs text-stone-500">
        Réimporter le même fichier ne crée pas de doublons : une réservation déjà présente (même date, même heure, même nom)
        est ignorée, et un client existant (même e-mail ou téléphone) est complété.
      </p>
    </div>
  );
}
