import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, Legal, LegalPage } from "@/components/legal-page";
import { LEGAL, LEGAL_UPDATED, SUBPROCESSORS, TRANSFER_SAFEGUARDS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Monkomi collecte et utilise les données personnelles.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updated={LEGAL_UPDATED.confidentialite}>
      <section>
        <h2>Qui sommes-nous ?</h2>
        <p>
          Monkomi est un service en ligne de réservation et de gestion de salle pour restaurants, édité par{" "}
          <Legal value={LEGAL.name} label="raison sociale" /> (voir les <Link href="/mentions-legales">mentions légales</Link>).
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
        <p>
          Pour les réservations, Monkomi agit pour le compte du restaurant concerné, qui reste responsable de l&apos;usage
          de ces données. Les engagements de Monkomi envers les restaurants sont détaillés dans l&apos;
          <Link href="/sous-traitance">accord de sous-traitance des données</Link>.
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
        <p>Nous ne vendons aucune donnée et n&apos;affichons aucune publicité.</p>
      </section>

      <section>
        <h2>Connexion avec Google</h2>
        <p>
          Si vous choisissez « Continuer avec Google », nous recevons uniquement votre nom, votre adresse e-mail et votre
          photo de profil, afin de créer votre compte et de vous connecter. Nous n&apos;accédons à aucune autre donnée de
          votre compte Google. L&apos;utilisation des informations reçues des API Google respecte les{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            règles relatives aux données utilisateur des services d&apos;API Google
          </a>
          , y compris les exigences d&apos;utilisation limitée.
        </p>
      </section>

      <section>
        <h2>Où sont stockées les données</h2>
        <ul>
          {SUBPROCESSORS.map((s) => (
            <li key={s.name}>{s.role} : {s.name}, {s.place}.</li>
          ))}
          <li>Connexion avec Google (facultative) : Google.</li>
        </ul>
        <p>{TRANSFER_SAFEGUARDS}</p>
      </section>

      <section>
        <h2>Durée de conservation</h2>
        <p>
          Les données de compte sont conservées tant que le compte est actif. À sa fermeture, le restaurant dispose de 30
          jours pour exporter ses données, qui sont ensuite supprimées (sauvegardes comprises au plus tard 30 jours plus
          tard). Les réservations et fiches clients sont conservées le temps nécessaire à leur gestion par le restaurant ;
          un convive peut demander leur suppression à tout moment.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Monkomi n&apos;utilise que des cookies strictement nécessaires (maintien de la connexion, sécurité de la
          connexion avec Google). Aucun cookie publicitaire ni de mesure d&apos;audience.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données, vous opposer à leur
          traitement ou en demander la portabilité en écrivant à <ContactEmail />. Pour une réservation, vous pouvez
          aussi vous adresser directement au restaurant. Vous pouvez introduire une réclamation auprès de l&apos;autorité
          de protection des données compétente (APD en Belgique, CNIL en France).
        </p>
      </section>
    </LegalPage>
  );
}
