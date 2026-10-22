import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, Legal, LegalPage } from "@/components/legal-page";
import { LEGAL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Conditions générales",
  description: "Conditions générales d'utilisation et de vente du service Monkomi pour les restaurants.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente" updated={LEGAL_UPDATED.conditions}>
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions régissent l&apos;utilisation du service Monkomi (réservations en ligne, plan de salle,
          fiches clients, carte en ligne, statistiques et e-mails associés), édité par{" "}
          <Legal value={LEGAL.name} label="raison sociale" /> (« l&apos;éditeur », voir les{" "}
          <Link href="/mentions-legales">mentions légales</Link>), par les restaurants qui créent un compte
          (« le restaurant »).
        </p>
        <p>
          Le service s&apos;adresse exclusivement aux professionnels. En créant un compte, le restaurant déclare agir dans
          le cadre de son activité professionnelle et accepte les présentes conditions, la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link> et l&apos;
          <Link href="/sous-traitance">accord de sous-traitance des données</Link>, qui en fait partie.
        </p>
        <p>
          Les personnes qui réservent une table (« les convives ») utilisent le formulaire de réservation gratuitement ;
          leur réservation est conclue avec le restaurant, et non avec l&apos;éditeur.
        </p>
      </section>

      <section>
        <h2>2. Compte</h2>
        <ul>
          <li>Le restaurant fournit des informations exactes (nom, adresse, coordonnées) et les tient à jour.</li>
          <li>
            Il garde ses identifiants confidentiels et reste responsable de ce qui est fait depuis son compte. En cas
            d&apos;utilisation non autorisée, il prévient l&apos;éditeur sans délai.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Prix</h2>
        <p>
          Pendant la phase bêta, le service est gratuit, sans engagement et sans carte bancaire. Aucune commission
          n&apos;est prélevée sur les réservations.
        </p>
        <p>
          À la fin de la bêta, l&apos;éditeur pourra proposer un abonnement payant. Il en informera le restaurant par
          e-mail au moins 30 jours à l&apos;avance, en indiquant le prix et les conditions. Aucun montant ne sera facturé
          sans que le restaurant ait souscrit lui-même à un abonnement. S&apos;il ne souscrit pas, son accès pourra être
          suspendu à la fin de la bêta ; ses données restent alors exportables pendant 30 jours, comme indiqué à
          l&apos;article 9.
        </p>
      </section>

      <section>
        <h2>4. Obligations du restaurant</h2>
        <ul>
          <li>
            Paramétrer correctement ses horaires, ses tables, sa capacité et ses fermetures : les créneaux proposés en
            ligne en dépendent.
          </li>
          <li>Honorer les réservations confirmées, ou prévenir lui-même les convives en cas d&apos;empêchement.</li>
          <li>
            Publier des contenus licites et dont il détient les droits (photos, textes, carte). Les informations sur les
            allergènes et les prix relèvent de sa seule responsabilité.
          </li>
          <li>
            Respecter la réglementation sur les données personnelles à l&apos;égard de ses convives, dont il est
            responsable du traitement. En particulier, il n&apos;utilise pas leurs coordonnées pour de la prospection
            commerciale sans leur consentement.
          </li>
          <li>
            Ne pas perturber le service (envois massifs, tentative d&apos;accès aux données d&apos;un autre restaurant,
            contournement des protections).
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Fonctionnement du service</h2>
        <p>
          L&apos;éditeur met en œuvre les moyens raisonnables pour que le service soit disponible et fonctionne
          correctement (obligation de moyens). Des interruptions peuvent survenir pour maintenance ou en cas de panne
          d&apos;un prestataire ; l&apos;éditeur s&apos;efforce de les limiter et, si possible, de les annoncer.
        </p>
        <p>
          Les e-mails aux convives (confirmation, rappel, demande d&apos;avis…) sont envoyés au nom du restaurant.
          Leur bonne réception dépend aussi des fournisseurs de messagerie et n&apos;est pas garantie. Il est conseillé au
          restaurant de rester joignable par téléphone.
        </p>
        <p>
          L&apos;éditeur peut faire évoluer le service (ajout, modification ou retrait de fonctionnalités). Il prévient le
          restaurant avant tout retrait d&apos;une fonctionnalité essentielle.
        </p>
      </section>

      <section>
        <h2>6. Données</h2>
        <p>
          Le restaurant reste propriétaire de ses données : carte, plan de salle, réservations et fiches clients. Il peut
          exporter ses réservations à tout moment depuis le back-office. L&apos;éditeur traite les données des convives
          uniquement pour le compte du restaurant et selon ses instructions, comme le prévoit l&apos;
          <Link href="/sous-traitance">accord de sous-traitance des données</Link>.
        </p>
      </section>

      <section>
        <h2>7. Responsabilité</h2>
        <p>
          L&apos;éditeur n&apos;est pas responsable des dommages indirects (perte de chiffre d&apos;affaires, de clientèle
          ou de données), des absences de convives, ni des conséquences d&apos;un paramétrage inexact par le restaurant.
        </p>
        <p>
          Sauf faute lourde ou intentionnelle, la responsabilité totale de l&apos;éditeur est limitée aux sommes payées par
          le restaurant pendant les 12 mois précédant le fait générateur, ou à 100 € pendant une période gratuite.
        </p>
      </section>

      <section>
        <h2>8. Durée et résiliation</h2>
        <ul>
          <li>Le contrat est conclu pour une durée indéterminée à partir de la création du compte.</li>
          <li>
            Le restaurant peut y mettre fin à tout moment, sans frais, en demandant la fermeture de son compte à{" "}
            <ContactEmail />.
          </li>
          <li>
            L&apos;éditeur peut suspendre ou fermer un compte en cas de manquement grave aux présentes conditions, après
            une mise en demeure restée sans effet pendant 15 jours, ou immédiatement en cas d&apos;atteinte à la sécurité
            du service. Il peut aussi mettre fin au service moyennant un préavis de 3 mois.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Après la fermeture du compte</h2>
        <p>
          Le restaurant dispose de 30 jours pour exporter ses données. Elles sont ensuite supprimées définitivement, y
          compris des sauvegardes au plus tard 30 jours plus tard, sauf obligation légale de conservation.
        </p>
      </section>

      <section>
        <h2>10. Modification des conditions</h2>
        <p>
          L&apos;éditeur peut modifier les présentes conditions. Toute modification importante est annoncée par e-mail au
          moins 30 jours avant son entrée en vigueur. Si le restaurant ne l&apos;accepte pas, il peut fermer son compte
          sans frais avant cette date. S&apos;il continue à utiliser le service ensuite, il accepte les nouvelles
          conditions.
        </p>
      </section>

      <section>
        <h2>11. Droit applicable et litiges</h2>
        <p>
          Les présentes conditions sont soumises au droit belge. En cas de litige, les parties cherchent d&apos;abord une
          solution amiable. À défaut, les tribunaux de l&apos;arrondissement du siège de l&apos;éditeur sont seuls
          compétents.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>Pour toute question : <ContactEmail />.</p>
      </section>
    </LegalPage>
  );
}
