import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, Legal, LegalPage } from "@/components/legal-page";
import { LEGAL, LEGAL_UPDATED, SUBPROCESSORS, TRANSFER_SAFEGUARDS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Accord de sous-traitance des données",
  description: "Accord de traitement des données personnelles (article 28 du RGPD) entre Monkomi et les restaurants.",
};

export default function DpaPage() {
  return (
    <LegalPage title="Accord de sous-traitance des données" updated={LEGAL_UPDATED.sousTraitance}>
      <section>
        <h2>1. Parties et objet</h2>
        <p>
          Le présent accord fait partie des <Link href="/conditions">conditions générales</Link>. Il encadre, conformément
          à l&apos;article 28 du Règlement général sur la protection des données (RGPD), les traitements que{" "}
          <Legal value={LEGAL.name} label="raison sociale" /> (« le sous-traitant ») effectue pour le compte de chaque
          restaurant utilisateur de Monkomi (« le responsable du traitement »).
        </p>
        <p>
          Pour les données de son propre compte (identifiants, informations de facturation), l&apos;éditeur agit en tant
          que responsable du traitement : voir la <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>

      <section>
        <h2>2. Description du traitement</h2>
        <ul>
          <li>
            <strong>Finalités</strong> : recevoir et gérer les réservations, les placer sur les tables, tenir les fiches
            clients et la liste d&apos;attente, envoyer les e-mails liés aux réservations (confirmation, modification,
            rappel, demande d&apos;avis si le restaurant l&apos;active), produire les statistiques du restaurant.
          </li>
          <li>
            <strong>Personnes concernées</strong> : les convives du restaurant (personnes qui réservent ou sont
            inscrites par le restaurant) et les inscrits à la liste d&apos;attente.
          </li>
          <li>
            <strong>Données</strong> : nom, adresse e-mail, téléphone, date, heure et nombre de couverts, remarques
            (pouvant contenir des allergies ou une occasion), statut et historique des réservations, notes et étiquettes
            ajoutées par le restaurant.
          </li>
          <li><strong>Durée</strong> : pendant toute la durée d&apos;utilisation du service, puis selon l&apos;article 9.</li>
        </ul>
        <p>
          Les remarques libres peuvent révéler des données de santé (allergies, régime). Le restaurant n&apos;y collecte
          que ce qui est nécessaire au repas et en informe ses convives.
        </p>
      </section>

      <section>
        <h2>3. Instructions du restaurant</h2>
        <p>
          Le sous-traitant ne traite les données que sur instruction documentée du restaurant : les présentes conditions
          et les réglages qu&apos;il choisit dans le back-office. Il n&apos;utilise pas ces données pour son propre compte,
          ne les vend pas et ne les croise pas entre restaurants. Si une instruction lui paraît contraire au RGPD, il en
          informe immédiatement le restaurant.
        </p>
      </section>

      <section>
        <h2>4. Confidentialité</h2>
        <p>
          Les personnes autorisées à accéder aux données (uniquement pour le support ou la maintenance) sont tenues à la
          confidentialité.
        </p>
      </section>

      <section>
        <h2>5. Sécurité</h2>
        <ul>
          <li>Chiffrement des échanges (HTTPS) et des mots de passe.</li>
          <li>
            Cloisonnement des données entre restaurants au niveau de la base de données : un compte n&apos;accède
            qu&apos;aux données de son restaurant.
          </li>
          <li>Accès des convives à leur réservation par un lien secret propre à chaque réservation.</li>
          <li>Protection contre les envois abusifs sur les formulaires publics.</li>
          <li>Base de données hébergée dans l&apos;Union européenne, avec sauvegardes chez son hébergeur.</li>
        </ul>
      </section>

      <section>
        <h2>6. Sous-traitants ultérieurs</h2>
        <p>Le restaurant autorise le recours aux sous-traitants suivants :</p>
        <ul>
          {SUBPROCESSORS.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong> : {s.role} ({s.place}).
            </li>
          ))}
        </ul>
        <p>{TRANSFER_SAFEGUARDS}</p>
        <p>
          Le sous-traitant impose à chacun des obligations de protection équivalentes à celles du présent accord. Il
          informe les restaurants par e-mail de tout ajout ou remplacement au moins 30 jours à l&apos;avance. Un
          restaurant qui s&apos;y oppose pour un motif légitime peut fermer son compte sans frais avant ce changement.
        </p>
      </section>

      <section>
        <h2>7. Droits des personnes</h2>
        <p>
          Le restaurant peut consulter, corriger et exporter les données de ses convives depuis le back-office. Si un
          convive s&apos;adresse directement au sous-traitant, sa demande est transmise au restaurant sans délai. Le
          sous-traitant aide le restaurant à répondre aux demandes qu&apos;il ne peut pas traiter seul (par exemple une
          suppression complète) dans un délai permettant de respecter le délai légal d&apos;un mois.
        </p>
      </section>

      <section>
        <h2>8. Violation de données</h2>
        <p>
          En cas de violation de données touchant le restaurant, le sous-traitant le prévient dans les meilleurs délais,
          et au plus tard 48 heures après en avoir pris connaissance. Il lui fournit les informations utiles pour
          notifier l&apos;autorité de contrôle et, le cas échéant, les personnes concernées. Il aide aussi le restaurant
          pour ses analyses d&apos;impact, si nécessaire.
        </p>
      </section>

      <section>
        <h2>9. Fin du contrat</h2>
        <p>
          À la fermeture du compte, le restaurant dispose de 30 jours pour exporter ses données. Le sous-traitant les
          supprime ensuite, sauvegardes comprises au plus tard 30 jours plus tard, sauf obligation légale de
          conservation.
        </p>
      </section>

      <section>
        <h2>10. Audit</h2>
        <p>
          Le sous-traitant met à la disposition du restaurant les informations nécessaires pour démontrer le respect du
          présent accord. Il répond à ses questions écrites et permet des audits raisonnables, à la charge du restaurant
          et annoncés au moins 30 jours à l&apos;avance.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>Pour toute question sur les données : <ContactEmail />.</p>
      </section>
    </LegalPage>
  );
}
