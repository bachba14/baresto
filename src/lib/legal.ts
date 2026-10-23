// Identité de l'éditeur, affichée sur les pages légales (mentions légales, conditions, confidentialité,
// sous-traitance). Renseignée par variables d'environnement (voir .env.example) ; NEXT_PUBLIC_* : relancer
// un build après modification. Une valeur absente s'affiche « à compléter » sur les pages.

const env = (v: string | undefined) => v?.trim() || null;

export const LEGAL = {
  /** Raison sociale (ex. « Monkomi SRL ») ou nom et prénom pour une personne physique. */
  name: env(process.env.NEXT_PUBLIC_LEGAL_NAME),
  /** Forme juridique (ex. « SRL », « entreprise individuelle »). */
  form: env(process.env.NEXT_PUBLIC_LEGAL_FORM),
  /** Adresse du siège ou de l'établissement. */
  address: env(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  /** Numéro d'entreprise BCE (ex. « 0123.456.789 »). */
  companyId: env(process.env.NEXT_PUBLIC_LEGAL_COMPANY_ID),
  /** Numéro de TVA, s'il diffère du numéro BCE ou si l'éditeur est assujetti. */
  vat: env(process.env.NEXT_PUBLIC_LEGAL_VAT),
  /** Adresse de contact (support, données personnelles). */
  email: env(process.env.NEXT_PUBLIC_LEGAL_EMAIL),
};

/** Dates de dernière mise à jour des textes (à changer à chaque modification de fond). */
export const LEGAL_UPDATED = {
  mentions: "22 octobre 2026",
  conditions: "23 octobre 2026",
  confidentialite: "23 octobre 2026",
  sousTraitance: "23 octobre 2026",
};

/** Sous-traitants ultérieurs (repris par la politique de confidentialité et l'accord de sous-traitance). */
export const SUBPROCESSORS = [
  { name: "Supabase Inc.", role: "Base de données, authentification et stockage des photos", place: "Union européenne (Paris)" },
  { name: "Hostinger International Ltd", role: "Hébergement du site et des serveurs applicatifs", place: "Union européenne" },
  {
    name: "Resend, Inc.",
    role: "Envoi des e-mails de réservation",
    place: "envoi depuis l'Union européenne (Irlande) ; société établie aux États-Unis",
  },
];

/** Garanties des transferts hors Union européenne (sous-traitants établis aux États-Unis). */
export const TRANSFER_SAFEGUARDS =
  "Lorsqu'un sous-traitant est établi hors de l'Union européenne, les transferts de données sont encadrés par les " +
  "clauses contractuelles types adoptées par la Commission européenne.";
