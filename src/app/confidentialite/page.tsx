import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Baresto collecte et utilise les données personnelles.",
};

// ⚠️ À compléter par l'éditeur du service avant publication / validation Google :
// identité de l'éditeur et adresse de contact pour les questions de données personnelles.
const EDITEUR = process.env.NEXT_PUBLIC_LEGAL_NAME ?? "l'éditeur de Baresto";
const CONTACT = process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? null;
const MISE_A_JOUR = "8 octobre 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fffaf3] text-stone-800">
      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link href="/"><Logo /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : {MISE_A_JOUR}</p>

        <div className="mt-8 space-y-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
          <section>
            <h2>Qui sommes-nous ?</h2>
            <p>
              Baresto est un service en ligne de réservation et de gestion de salle pour restaurants, édité par {EDITEUR}.
              Cette page explique quelles données nous traitons, pourquoi, et quels sont vos droits.
            </p>
          </section>

          <section>
            <h2>Données que nous traitons</h2>
            <p className="mb-2"><strong>Restaurateurs (titulaires d&apos;un compte)</strong></p>
            <ul>
              <li>Adresse e-mail et mot de passe (chiffré), ou, en cas de connexion avec Google, votre nom, votre adresse e-mail et votre photo de profil fournis par Google.</li>
              <li>Informations sur votre restaurant : nom, adresse, téléphone, horaires, carte, plan de salle.</li>
            </ul>
            <p className="mt-4 mb-2"><strong>Clients des restaurants (réservations)</strong></p>
            <ul>
              <li>Nom, adresse e-mail et/ou téléphone, nombre de personnes, date et heure, remarques éventuelles.</li>
            </ul>
            <p className="mt-3">
              Pour les réservations, Baresto agit pour le compte du restaurant concerné, qui reste responsable de l&apos;usage
              de ces données.
            </p>
          </section>

          <section>
            <h2>Pourquoi nous les utilisons</h2>
            <ul>
              <li>Créer et sécuriser votre compte, vous permettre de vous connecter (exécution du service).</li>
              <li>Enregistrer et gérer les réservations, et les afficher au restaurant concerné.</li>
              <li>
                Envoyer les e-mails liés à une réservation : confirmation, lien de modification ou d&apos;annulation, rappel
                avant le repas, alerte de liste d&apos;attente et, si le restaurant l&apos;a activée, une demande d&apos;avis le
                lendemain.
              </li>
              <li>
                Permettre au restaurant de tenir une fiche client (historique des réservations, notes) regroupant les
                réservations faites avec la même adresse e-mail ou le même téléphone.
              </li>
              <li>Assurer le bon fonctionnement, la sécurité et le support du service (intérêt légitime).</li>
            </ul>
            <p className="mt-3">Nous ne vendons aucune donnée et n&apos;affichons aucune publicité.</p>
          </section>

          <section>
            <h2>Connexion avec Google</h2>
            <p>
              Si vous choisissez « Continuer avec Google », nous recevons uniquement votre nom, votre adresse e-mail et votre
              photo de profil, afin de créer votre compte et de vous connecter. Nous n&apos;accédons à aucune autre donnée de
              votre compte Google. L&apos;utilisation des informations reçues des API Google respecte les{" "}
              <a className="text-amber-700 underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
                règles relatives aux données utilisateur des services d&apos;API Google
              </a>
              , y compris les exigences d&apos;utilisation limitée.
            </p>
          </section>

          <section>
            <h2>Où sont stockées les données</h2>
            <ul>
              <li>Base de données et authentification : Supabase, hébergement dans l&apos;Union européenne (Paris).</li>
              <li>Hébergement du site : Hostinger.</li>
              <li>Connexion avec Google (facultative) : Google.</li>
            </ul>
          </section>

          <section>
            <h2>Durée de conservation</h2>
            <p>
              Les données de compte sont conservées tant que le compte est actif, puis supprimées à sa fermeture. Les
              réservations sont conservées le temps nécessaire à leur gestion par le restaurant, puis supprimées ou
              anonymisées.
            </p>
          </section>

          <section>
            <h2>Cookies</h2>
            <p>
              Baresto n&apos;utilise que des cookies strictement nécessaires (maintien de la connexion, sécurité de la
              connexion avec Google). Aucun cookie publicitaire ni de mesure d&apos;audience.
            </p>
          </section>

          <section>
            <h2>Vos droits</h2>
            <p>
              Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données, vous opposer à leur
              traitement ou en demander la portabilité
              {CONTACT ? (
                <>
                  {" "}en écrivant à{" "}
                  <a className="text-amber-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
                </>
              ) : null}
              . Pour une réservation, vous pouvez aussi vous adresser directement au restaurant. Vous pouvez introduire une
              réclamation auprès de l&apos;autorité de protection des données compétente (APD en Belgique, CNIL en France).
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-900">← Retour à l&apos;accueil</Link>
      </footer>
    </div>
  );
}
