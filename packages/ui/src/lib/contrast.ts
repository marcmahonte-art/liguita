/**
 * Mesure de contraste WCAG 2.2 — utilitaire d'audit du design system.
 *
 * Sert à deux choses :
 *  1. la page `/design-system` affiche les ratios RÉELLEMENT mesurés, jamais des valeurs
 *     recopiées à la main dans une documentation qui dérive silencieusement ;
 *  2. les tests peuvent affirmer des invariants d'accessibilité.
 *
 * ⚠️ Le test `__tests__/tokens-parity.test.ts` embarque volontairement sa PROPRE
 * implémentation. Ce n'est pas une duplication accidentelle : une fonction de mesure
 * vérifiée par elle-même ne vérifie rien. Deux implémentations indépendantes qui
 * s'accordent constituent une vraie vérification.
 *
 * Références :
 *  · WCAG 2.2 SC 1.4.3 — contraste du texte, 4,5:1 (AA)
 *  · WCAG 2.2 SC 1.4.11 — contraste des composants d'interface, 3:1 (AA)
 *  · Formule de luminance relative : https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */

/** Seuils WCAG 2.2 niveau AA. */
export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;
export const WCAG_AA_UI = 3;

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Convertit une couleur hexadécimale (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) en composantes
 * 0–255. Lève une erreur sur une entrée invalide : une faute de frappe dans un jeton
 * doit se voir tout de suite, pas produire silencieusement un ratio de 1:1.
 */
export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, '');
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Couleur hexadécimale invalide : « ${hex} »`);
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
export function relativeLuminance(color: string): number {
  const { r, g, b } = parseHex(color);
  const channel = (raw: number): number => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Ratio de contraste entre deux couleurs, de 1:1 à 21:1.
 * L'ordre des arguments n'a pas d'importance.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Arrondi à deux décimales, pour l'affichage. */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Le couple de couleurs respecte-t-il le seuil demandé ?
 *
 * @param kind `'text'` (4,5:1), `'large-text'` ou `'ui'` (3:1).
 *
 * ⚠️ `'ui'` s'applique aux composants dont la FORME porte l'information : bordure de
 * champ, contour de case à cocher. WCAG SC 1.4.3 exempte explicitement les composants
 * inactifs (désactivés) — un bouton `disabled` peut donc rester sous 4,5:1.
 */
export function meetsWcagAA(
  foreground: string,
  background: string,
  kind: 'text' | 'large-text' | 'ui' = 'text',
): boolean {
  const threshold =
    kind === 'text' ? WCAG_AA_TEXT : kind === 'large-text' ? WCAG_AA_LARGE_TEXT : WCAG_AA_UI;
  return contrastRatio(foreground, background) >= threshold;
}
