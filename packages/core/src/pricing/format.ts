/**
 * Formatage monétaire Liguita.
 *
 * Règles rédactionnelles (plan v3 §2.3) :
 *  · Séparateur de milliers : espace insécable fine.
 *  · Devise : toujours « FCFA » en clair — jamais « XAF » ni un symbole, le public cible
 *    ne lit pas les codes ISO.
 *  · Exemple : `1 200 FCFA`, jamais `1200FCFA`.
 */

const NBSP = '\u202F'; // espace fine insécable

const formatter = new Intl.NumberFormat('fr-FR', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

/**
 * Formate un montant entier avec sa devise.
 *
 * @example formatMoney(1200) === '1 200 FCFA'
 */
export function formatMoney(amount: number, currency = 'FCFA'): string {
  const rounded = Math.round(amount);
  const grouped = formatter.format(rounded).replace(/\u00A0|\u202F/g, NBSP);
  return `${grouped}${NBSP}${currency}`;
}

/** Formate un montant sans devise. @example formatAmount(1200) === '1 200' */
export function formatAmount(amount: number): string {
  return formatter.format(Math.round(amount)).replace(/\u00A0|\u202F/g, NBSP);
}

/**
 * Parse une saisie utilisateur en montant entier.
 * Tolère les espaces, les points et les virgules comme séparateurs de milliers.
 * Retourne `null` si la saisie n'est pas un montant exploitable.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[\s\u00A0\u202F.]/g, '').replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}
