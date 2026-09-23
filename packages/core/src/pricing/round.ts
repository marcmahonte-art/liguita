/**
 * Politique d'arrondi du moteur de tarification.
 *
 * Tous les montants sont des entiers, dans l'unité monétaire du pays (FCFA pour le Tchad).
 * Aucun flottant ne doit atteindre la base de données ni l'affichage.
 */

/** Arrondit au multiple le plus proche. `roundTo(150, 100) === 200`. */
export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

/** Arrondi au multiple de 100 — utilisé pour les frais et récompenses de classe C5. */
export function round100(value: number): number {
  return roundTo(value, 100);
}

/** Arrondi au multiple de 50 — utilisé pour le supplément d'urgence. */
export function round50(value: number): number {
  return roundTo(value, 50);
}

/**
 * Extrait la TVA incluse dans un montant affiché hors taxes.
 *
 * La commission Liguita est communiquée hors taxes : la TVA n'est pas ajoutée au montant
 * payé par l'utilisateur, elle est isolée pour la comptabilité.
 */
export function extractVat(amountHt: number, vatRate: number): number {
  if (vatRate <= 0 || amountHt <= 0) return 0;
  return amountHt - Math.round(amountHt / (1 + vatRate));
}
