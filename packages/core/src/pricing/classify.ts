/**
 * Classement automatique d'un objet dans une classe tarifaire.
 *
 * Le classement combine TROIS sources, et retient toujours la plus élevée :
 *
 *   1. La classe par défaut de la catégorie.
 *      Ex. « Téléphone entrée de gamme » → C3, « Lot d'entreprise » → C5.
 *
 *   2. La montée d'un cran lorsque la valeur déclarée dépasse le plafond de la catégorie.
 *      Le plafond est propre à la catégorie, car le calibrage tchadien montre que la
 *      frontière C3 → C4 est à ≈ 200 000 FCFA pour un smartphone mais à ≈ 600 000 FCFA
 *      pour un ordinateur portable. Une borne unique serait fausse dans les deux cas.
 *
 *   3. La bande de valeur globale (`rule.valueBands`), qui fixe la classe minimale
 *      toutes catégories confondues.
 *
 * Deux garde-fous :
 *   · Un objet dont la valeur déclarée dépasse le seuil C5 (1 000 000 FCFA) est classé C5.
 *   · Aucun déclassement automatique : une valeur faible ne fait jamais baisser la classe.
 *
 * Principe directeur : ne jamais dissuader la restitution par le prix.
 */

import type { CategoryRef, PricingClass, PricingRule, ValueBand } from './types';

/** Ordre croissant des classes. */
export const CLASS_ORDER: readonly PricingClass[] = ['C1', 'C2', 'C3', 'C4', 'C5'];

const RANK: Record<PricingClass, number> = { C1: 0, C2: 1, C3: 2, C4: 3, C5: 4 };

const NEXT_CLASS: Record<PricingClass, PricingClass> = {
  C1: 'C2',
  C2: 'C3',
  C3: 'C4',
  C4: 'C5',
  C5: 'C5',
};

/** Seuil absolu de bascule vers la classe C5, en FCFA. */
export const DEFAULT_C5_THRESHOLD = 1_000_000;

/**
 * Bandes de valeur globales par défaut, alignées sur le calibrage marché.
 * Elles sont surchargeables par la grille active (`pricing_rules.value_bands`).
 */
export const DEFAULT_VALUE_BANDS: readonly ValueBand[] = [
  { upTo: 60_000, pricingClass: 'C1' },
  { upTo: 100_000, pricingClass: 'C2' },
  { upTo: 300_000, pricingClass: 'C3' },
  { upTo: Number.POSITIVE_INFINITY, pricingClass: 'C4' },
];

/** Retourne la classe la plus élevée d'une liste. */
function highest(...classes: readonly PricingClass[]): PricingClass {
  let best: PricingClass = 'C1';
  for (const cls of classes) {
    if (RANK[cls] > RANK[best]) best = cls;
  }
  return best;
}

/**
 * Classe minimale déduite de la valeur déclarée, d'après les bandes globales.
 * Retourne `null` si aucune bande ne correspond (liste vide ou mal configurée).
 */
export function classFromValueBands(
  value: number,
  bands: readonly ValueBand[],
): PricingClass | null {
  for (const band of bands) {
    if (value <= band.upTo) return band.pricingClass;
  }
  const last = bands[bands.length - 1];
  return last ? last.pricingClass : null;
}

export interface ClassResolution {
  readonly pricingClass: PricingClass;
  readonly classSource: 'CATEGORY' | 'DECLARED_VALUE';
}

/**
 * Détermine la classe tarifaire applicable.
 *
 * @param category Catégorie de l'objet (classe par défaut + plafond de valeur).
 * @param declaredValueXaf Valeur déclarée par le propriétaire, facultative.
 * @param rule Grille tarifaire active.
 */
export function resolveClass(
  category: CategoryRef,
  declaredValueXaf: number | null | undefined,
  rule: PricingRule,
): ClassResolution {
  const defaultClass = category.defaultClass;

  if (declaredValueXaf == null || declaredValueXaf <= 0) {
    return { pricingClass: defaultClass, classSource: 'CATEGORY' };
  }

  // Garde-fou absolu : au-delà du seuil C5, la classe est C5 quelle que soit la catégorie.
  const c5Threshold = rule.classUpgradeThresholds.C5 ?? DEFAULT_C5_THRESHOLD;
  if (declaredValueXaf > c5Threshold) {
    return { pricingClass: 'C5', classSource: 'DECLARED_VALUE' };
  }

  // 1. Bande de valeur globale
  const bandClass = classFromValueBands(declaredValueXaf, rule.valueBands);

  // 2. Montée d'un cran au-delà du plafond de la catégorie
  const steppedClass =
    category.maxValueXaf != null && declaredValueXaf > category.maxValueXaf
      ? NEXT_CLASS[defaultClass]
      : defaultClass;

  // 3. La plus élevée des trois — jamais moins que la classe de la catégorie
  const pricingClass = highest(defaultClass, bandClass ?? defaultClass, steppedClass);

  return {
    pricingClass,
    classSource: pricingClass === defaultClass ? 'CATEGORY' : 'DECLARED_VALUE',
  };
}
