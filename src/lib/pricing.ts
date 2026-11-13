/** Grille tarifaire de Monkomi (prix HT par mois, en euros). */
export const PRICES = {
  /** Offre fondateur, réservée aux premiers restaurants, payée à l'année et garantie à vie. */
  founder: 25,
  /** Offre standard, paiement annuel (prix ramené au mois). */
  annual: 35,
  /** Offre standard, paiement mensuel. */
  monthly: 40,
  founderSeats: 20,
};

/** 25 → « 25 », 24.99 → « 24,99 ». */
export const price = (n: number) =>
  new Intl.NumberFormat("fr-BE", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);

/** 0.125 → « 12,5 % ». */
export const percent = (ratio: number) =>
  new Intl.NumberFormat("fr-BE", { style: "percent", maximumFractionDigits: 1 }).format(ratio);
