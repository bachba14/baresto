/** Grille tarifaire de Monkomi (prix par mois, en euros). */
export const PRICES = {
  /** Offre fondateur, réservée aux premiers restaurants. */
  founder: 24.99,
  /** Offre standard, paiement annuel (prix ramené au mois). */
  annual: 34.99,
  /** Offre standard, paiement mensuel. */
  monthly: 39.99,
  founderSeats: 20,
};

/** 24.99 → « 24,99 ». */
export const price = (n: number) => n.toFixed(2).replace(".", ",");
