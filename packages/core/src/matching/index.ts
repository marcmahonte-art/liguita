/**
 * Moteur de correspondance Liguita — point d'entrée.
 *
 * @example
 * ```ts
 * import { scoreMatch, shouldNotify } from '@liguita/core/matching';
 *
 * const result = scoreMatch(lostItem, foundItem);
 * if (shouldNotify(result)) {
 *   // notifier le propriétaire
 * }
 * ```
 */

export {
  scoreMatch,
  levelFromScore,
  shouldPersist,
  shouldNotify,
  similarityType,
  similarityPlace,
  similarityDate,
  similarityColor,
  similarityBrand,
  similarityDescription,
} from './score';

export {
  normalize,
  tokens,
  trigrams,
  trigramSimilarity,
  jaccard,
  normalizeColor,
} from './text';

export {
  MATCH_WEIGHTS,
  MATCH_THRESHOLDS,
  NEUTRAL_SIMILARITY,
  DATE_WINDOW_DAYS,
  type MatchLevel,
  type MatchSignals,
  type LostSide,
  type FoundSide,
  type MatchBreakdown,
  type MatchResult,
  type ColorCode,
} from './types';
