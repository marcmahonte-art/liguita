/**
 * Moteur de tarification Liguita — point d'entrée.
 *
 * @example
 * ```ts
 * import { computeFee, PRICING_RULE_V1, formatMoney } from '@liguita/core/pricing';
 *
 * const quote = computeFee({
 *   rule: PRICING_RULE_V1,
 *   category: { id: 'phone-mid', defaultClass: 'C3', maxValueXaf: 200_000 },
 *   options: ['URGENT'],
 * });
 *
 * formatMoney(quote.totalAmount); // '1 800 FCFA'
 * ```
 */

export { computeFee } from './compute';
export {
  resolveClass,
  classFromValueBands,
  CLASS_ORDER,
  DEFAULT_C5_THRESHOLD,
  DEFAULT_VALUE_BANDS,
  type ClassResolution,
} from './classify';
export { roundTo, round100, round50, extractVat } from './round';
export { formatMoney, formatAmount, parseAmount } from './format';
export { PRICING_RULE_V1 } from './default-rule';

export {
  PricingError,
  type PricingClass,
  type PricingOptionCode,
  type Payee,
  type ClassSource,
  type PricingRule,
  type ValueBand,
  type CategoryRef,
  type FeeInput,
  type FeeLine,
  type FeeBreakdown,
  type PricingErrorCode,
} from './types';
