import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, Legal, LegalPage } from "@/components/legal-page";
import { LEGAL, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et contact du service Monkomi.",
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales" updated={LEGAL_UPDATED.mentions}>
      <section>
        <h2>Éditeur</h2>
        <p>
          Le site monkomi.be et le service Monkomi sont édités par :
        </p>
        <ul>
          <li><Legal value={LEGAL.name} label="raison sociale" />{LEGAL.form ? `, ${LEGAL.form}` : ""}</li>
          <li>Siège : <Legal value={LEGAL.address} label="adresse" /></li>
          <li>Numéro d&apos;entreprise (BCE) : <Legal value={LEGAL.companyId} label="numéro BCE" /></li>
          {LEGAL.vat && <li>TVA : {LEGAL.vat}</li>}
          <li>Contact : <ContactEmail /></li>
        </ul>
      </section>

      <section>
        <h2>Hébergement</h2>
        <ul>
          <li>Site et serveurs applicatifs : Hostinger International Ltd, 61 Lordou Vironos Street, 6023 Larnaca, Chypre.</li>
          <li>Base de données : Supabase Inc., dans un centre de données situé dans l&apos;Union européenne (Paris).</li>
        </ul>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom Monkomi, le logo, les textes, l&apos;interface et le code du service appartiennent à l&apos;éditeur. Toute
          reproduction sans autorisation est interdite. Les contenus publiés par les restaurants (carte, photos, textes)
          restent la propriété de chaque restaurant.
        </p>
      </section>

      <section>
        <h2>Données personnelles et cookies</h2>
        <p>
          Voir la <Link href="/confidentialite">politique de confidentialité</Link>. Pour les restaurants utilisateurs du
          service, voir aussi l&apos;<Link href="/sous-traitance">accord de sous-traitance des données</Link>.
        </p>
      </section>

      <section>
        <h2>Réservations</h2>
        <p>
          Monkomi fournit l&apos;outil de réservation ; chaque réservation est passée auprès du restaurant concerné, qui en
          reste seul responsable (accueil, modification, annulation). Pour toute question sur une réservation, contactez
          directement le restaurant.
        </p>
      </section>
    </LegalPage>
  );
}
