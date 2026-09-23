/**
 * Calcul du score de correspondance entre un objet perdu et un objet trouvé.
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §6.2 et §6.3
 *
 *   score = Σ (poids_i × similarité_i)
 *
 * Les pondérations somment à 100, le score est donc directement exprimé en pourcentage.
 * Le score exact reste invisible pour l'utilisateur : l'interface affiche un libellé et un
 * badge arrondi à la dizaine, jamais « 92,47 % ».
 */

import { jaccard, normalize, normalizeColor, tokens, trigramSimilarity } from './text';
import {
  DATE_WINDOW_DAYS,
  MATCH_THRESHOLDS,
  MATCH_WEIGHTS,
  NEUTRAL_SIMILARITY,
  type FoundSide,
  type LostSide,
  type MatchBreakdown,
  type MatchLevel,
  type MatchResult,
} from './types';

/* -------------------------------------------------------------------------- */
/* Fonctions de similarité — chacune retourne une valeur entre 0 et 1          */
/* -------------------------------------------------------------------------- */

/**
 * Type d'objet — le discriminant le plus fort.
 * · 1,00 même type précis · 0,60 même catégorie · 0,30 catégories sœurs · 0 sinon
 */
export function similarityType(lost: LostSide, found: FoundSide): number {
  if (lost.itemTypeId && lost.itemTypeId === found.itemTypeId) return 1;
  if (lost.categoryId === found.categoryId) return 0.6;
  if (lost.parentCategoryId && lost.parentCategoryId === found.parentCategoryId) return 0.3;
  return 0;
}

/**
 * Lieu — à N'Djamena, la zone est un indice très fiable.
 * · 1,00 même lieu · 0,70 même quartier · 0,40 même ville · 0,10 même pays
 * · 0,50 si les deux lieux sont inconnus (neutre) · 0 sinon
 *
 * « Lieu inconnu » s'entend au sens strict : ni lieu précis, ni quartier, ni ville des deux
 * côtés. Le pays, lui, est toujours renseigné — il ne peut donc pas servir de test de
 * neutralité, sinon la règle neutre serait inatteignable.
 */
export function similarityPlace(lost: LostSide, found: FoundSide): number {
  const lostKnown = Boolean(lost.placeId || lost.neighborhoodId || lost.cityId);
  const foundKnown = Boolean(found.placeId || found.neighborhoodId || found.cityId);
  if (!lostKnown && !foundKnown) return NEUTRAL_SIMILARITY;

  if (lost.placeId && lost.placeId === found.placeId) return 1;
  if (lost.neighborhoodId && lost.neighborhoodId === found.neighborhoodId) return 0.7;
  if (lost.cityId && lost.cityId === found.cityId) return 0.4;
  if (lost.countryCode === found.countryCode) return 0.1;
  return 0;
}

/**
 * Date — décroissance linéaire sur une fenêtre de 30 jours.
 *
 * Un objet trouvé avant la perte est impossible : le signal vaut 0, ce qui suffit à
 * écarter la paire sans autre traitement.
 */
export function similarityDate(lostAt: Date, foundAt: Date): number {
  const days = (foundAt.getTime() - lostAt.getTime()) / 86_400_000;
  if (days < -1) return 0;
  return Math.max(0, 1 - Math.abs(days) / DATE_WINDOW_DAYS);
}

/** Couleur — 1,00 identiques · 0,50 si l'une est inconnue · 0 sinon. */
export function similarityColor(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const codeA = normalizeColor(a);
  const codeB = normalizeColor(b);

  const unknownA = codeA === 'UNKNOWN';
  const unknownB = codeB === 'UNKNOWN';
  if (unknownA || unknownB) return NEUTRAL_SIMILARITY;

  return codeA === codeB ? 1 : 0;
}

/** Marque — comparaison floue, tolérante aux fautes de frappe. */
export function similarityBrand(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  if (!a || !b) return NEUTRAL_SIMILARITY;

  const similarity = trigramSimilarity(a, b);
  if (similarity >= 0.8) return 1;
  if (similarity >= 0.5) return 0.6;
  return 0;
}

/**
 * Description — le maximum entre la similarité par trigrammes (tolérante aux fautes)
 * et l'indice de Jaccard sur les mots significatifs (capte les détails inhabituels).
 */
export function similarityDescription(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const hasA = Boolean(a && a.trim().length > 0);
  const hasB = Boolean(b && b.trim().length > 0);

  if (!hasA && !hasB) return NEUTRAL_SIMILARITY;
  if (!hasA || !hasB) return 0.3;

  const textA = a as string;
  const textB = b as string;

  return Math.max(
    trigramSimilarity(normalize(textA), normalize(textB)),
    jaccard(tokens(textA), tokens(textB)),
  );
}

/* -------------------------------------------------------------------------- */
/* Score global                                                                */
/* -------------------------------------------------------------------------- */

/** Traduit un score en niveau de confiance. */
export function levelFromScore(score: number): MatchLevel {
  if (score >= MATCH_THRESHOLDS.veryLikely) return 'VERY_LIKELY';
  if (score >= MATCH_THRESHOLDS.possible) return 'POSSIBLE';
  return 'WEAK';
}

/**
 * Calcule le score de correspondance.
 *
 * @returns score (0–100), niveau et détail par signal. Le détail est persisté en base
 *          (`matches.breakdown`) pour permettre l'analyse des faux positifs.
 */
export function scoreMatch(lost: LostSide, found: FoundSide): MatchResult {
  const breakdown: MatchBreakdown = {
    type: similarityType(lost, found),
    place: similarityPlace(lost, found),
    date: similarityDate(lost.lostAt, found.foundAt),
    color: similarityColor(lost.colorCode, found.colorCode),
    brand: similarityBrand(lost.brand, found.brand),
    description: similarityDescription(lost.description, found.description),
  };

  const weighted =
    MATCH_WEIGHTS.type * breakdown.type +
    MATCH_WEIGHTS.place * breakdown.place +
    MATCH_WEIGHTS.date * breakdown.date +
    MATCH_WEIGHTS.color * breakdown.color +
    MATCH_WEIGHTS.brand * breakdown.brand +
    MATCH_WEIGHTS.description * breakdown.description;

  // Arrondi à deux décimales : suffisant pour le tri, sans bruit de flottant en base.
  const score = Math.round(weighted * 100) / 100;

  return { score, level: levelFromScore(score), breakdown };
}

/** Vrai si la correspondance mérite d'être persistée (score ≥ seuil de bruit). */
export function shouldPersist(result: MatchResult): boolean {
  return result.score >= MATCH_THRESHOLDS.persist;
}

/** Vrai si une notification doit être envoyée au propriétaire. */
export function shouldNotify(result: MatchResult): boolean {
  return result.score >= MATCH_THRESHOLDS.possible;
}
