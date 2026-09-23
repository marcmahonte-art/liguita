/**
 * Formatage des dates et des libellés.
 *
 * ⚠️ **Le fuseau horaire est figé sur UTC, et ce n'est pas un détail.**
 *
 * Ces fonctions sont appelées à la fois au rendu serveur et au rendu navigateur. Sans
 * fuseau explicite, le serveur formate en UTC et le navigateur dans le fuseau de
 * l'utilisateur : la même date produit deux textes différents, et React signale une
 * erreur d'hydratation. Le figer supprime la classe entière de problèmes.
 *
 * La locale est figée sur `fr-FR` pour la même raison : la langue de l'interface ne
 * dépend pas de la configuration du poste.
 *
 * Les montants ne sont PAS formatés ici : ils le sont par `@liguita/ui` (`<Money />`)
 * et `@liguita/core/pricing` (`formatMoney`), source unique de vérité.
 */

const LOCALE = 'fr-FR';
const TIME_ZONE = 'UTC';

const longDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const dayAndMonth = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  timeZone: TIME_ZONE,
});

/** « 22 septembre 2026 » */
export function formatLongDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** « 22 sept. 2026 » */
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

/** « 22 septembre » — pour l'année en cours. */
export function formatDayAndMonth(iso: string): string {
  return dayAndMonth.format(new Date(iso));
}

/**
 * Écart en jours entiers entre deux dates, arrondi vers le bas.
 * Sert à afficher « il y a 3 jours » sans dépendre de l'horloge du poste.
 */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.floor((to - from) / 86_400_000);
}

/**
 * Initiales d'un nom complet, au plus deux lettres.
 * Délègue à `@liguita/ui` : la même règle sert au composant `<Avatar />`.
 */
export { initialsOf } from '@liguita/ui';
