/**
 * Exemples de tarification dérivés du référentiel réel.
 *
 * ⚠️ **Aucun montant n'est écrit en dur ici.** On sélectionne la première catégorie
 * feuille de chaque classe dans `@liguita/config`, puis on laisse le moteur de
 * `@liguita/core/pricing` calculer. Deux conséquences :
 *
 *  · si une catégorie est renommée ou retirée du référentiel, la page continue de
 *    fonctionner au lieu de lever une erreur au build ;
 *  · si la grille tarifaire évolue, tous les montants affichés suivent automatiquement.
 *
 * C'est la raison d'être de ce module partagé : la vitrine du design system et les
 * données de démonstration du tableau de bord doivent afficher exactement les mêmes
 * montants, sans que l'un puisse dériver de l'autre.
 */

import { LEAF_CATEGORIES, findCategory, type CategoryConfig } from '@liguita/config';
import {
  CLASS_ORDER,
  PRICING_RULE_V1,
  computeFee,
  type FeeBreakdown,
  type PricingClass,
} from '@liguita/core/pricing';

export interface PricingExample {
  readonly category: CategoryConfig;
  readonly quote: FeeBreakdown;
}

/** Valeur déclarée utilisée pour illustrer la classe C5, calculée sur la valeur. */
const C5_SAMPLE_DECLARED_VALUE = 500_000;

/**
 * Première catégorie feuille rencontrée pour chaque classe tarifaire.
 *
 * Une classe sans catégorie feuille est simplement absente de la table : mieux vaut
 * afficher quatre lignes que de lever une exception à cause d'un référentiel incomplet.
 */
export function firstCategoryByClass(): Map<PricingClass, CategoryConfig> {
  const byClass = new Map<PricingClass, CategoryConfig>();
  for (const category of LEAF_CATEGORIES) {
    if (!byClass.has(category.defaultClass)) byClass.set(category.defaultClass, category);
  }
  return byClass;
}

/** Un exemple de devis par classe tarifaire, dans l'ordre C1 → C5. */
export function buildPricingExamples(): readonly PricingExample[] {
  const byClass = firstCategoryByClass();

  return CLASS_ORDER.flatMap((pricingClass) => {
    const category = byClass.get(pricingClass);
    if (!category) return [];

    try {
      const quote = computeFee({
        rule: PRICING_RULE_V1,
        category: {
          id: category.id,
          defaultClass: category.defaultClass,
          maxValueXaf: category.maxValueXaf,
        },
        declaredValueXaf: pricingClass === 'C5' ? C5_SAMPLE_DECLARED_VALUE : null,
      });
      return [{ category, quote }];
    } catch {
      /* Un référentiel incomplet ne doit pas casser une page de vitrine. */
      return [];
    }
  });
}

/** Exemple correspondant à une classe précise, ou `undefined` si la classe est absente. */
export function exampleForClass(pricingClass: PricingClass): PricingExample | undefined {
  return buildPricingExamples().find((example) => example.quote.pricingClass === pricingClass);
}

/**
 * Montant des frais de mise en relation pour une classe donnée.
 * Renvoie `null` si la classe n'a pas d'exemple disponible dans le référentiel.
 */
export function connectionFeeFor(pricingClass: PricingClass): number | null {
  return exampleForClass(pricingClass)?.quote.totalAmount ?? null;
}

/** Montant de la récompense reversée au trouveur pour une classe donnée. */
export function finderRewardFor(pricingClass: PricingClass): number | null {
  return exampleForClass(pricingClass)?.quote.rewardAmount ?? null;
}

/**
 * Récompense estimée pour un code de catégorie réel.
 *
 * Utilisé par le tableau de bord pour afficher, sur une annonce active, le montant que
 * la personne peut espérer. C'est une **estimation** issue de la grille : elle ne vaut
 * engagement, et le montant définitif n'est confirmé qu'au moment de la mise en relation.
 *
 * Renvoie `null` — et l'interface n'affiche alors aucun montant — lorsque la catégorie
 * est inconnue ou lorsque la classe dépend d'une valeur déclarée (C5) : mieux vaut une
 * case vide qu'un chiffre faux.
 */
export function finderRewardForCategory(categoryCode: string): number | null {
  const category = findCategory(categoryCode);
  if (!category) return null;
  try {
    return (
      computeFee({
        rule: PRICING_RULE_V1,
        category: {
          id: category.id,
          defaultClass: category.defaultClass,
          maxValueXaf: category.maxValueXaf,
        },
        declaredValueXaf: null,
      }).rewardAmount ?? null
    );
  } catch {
    return null;
  }
}
