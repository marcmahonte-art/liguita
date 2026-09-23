/**
 * Normalisation et similarité textuelle.
 *
 * ⚠️ `trigramSimilarity` reproduit l'algorithme de `similarity()` de l'extension PostgreSQL
 * `pg_trgm` : découpage en trigrammes de mots, chaque mot étant encadré de deux espaces
 * avant et d'un espace après, puis rapport |intersection| / |union|.
 *
 * Un test de parité entre cette implémentation et `pg_trgm` doit être exécuté sur un corpus
 * réel (plan v3 §6.4) : c'est lui qui garantit qu'un score calculé hors base est identique
 * au score calculé en base.
 */

import type { ColorCode } from './types';

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Normalise une chaîne pour la comparaison : minuscules, accents retirés,
 * ponctuation remplacée par des espaces, espaces multiples compactés.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mots vides français ignorés dans le calcul de recouvrement. */
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'a', 'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans',
  'je', 'j', 'ai', 'est', 'sont', 'ce', 'cet', 'cette', 'mon', 'ma', 'mes',
  'son', 'sa', 'ses', 'il', 'elle', 'que', 'qui', 'plus', 'tres', 'bien',
]);

/** Découpe en mots significatifs (normalisés, sans mots vides, longueur ≥ 3). */
export function tokens(input: string): string[] {
  return normalize(input)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

/* -------------------------------------------------------------------------- */
/* Trigrammes                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Extrait l'ensemble des trigrammes d'une chaîne, à la manière de `pg_trgm`.
 *
 * Chaque mot est encadré de deux espaces avant et d'un espace après.
 * Exemple : `carte` → `  carte ` → `  c`, ` ca`, `car`, `art`, `rte`, `te `, `e  `
 */
export function trigrams(input: string): Set<string> {
  const result = new Set<string>();
  const words = normalize(input).split(' ').filter(Boolean);

  for (const word of words) {
    const padded = `  ${word} `;
    if (padded.length <= 3) {
      result.add(padded);
      continue;
    }
    for (let i = 0; i + 3 <= padded.length; i += 1) {
      result.add(padded.slice(i, i + 3));
    }
  }

  return result;
}

/**
 * Similarité par trigrammes, entre 0 et 1.
 * Retourne 0 si l'une des deux chaînes ne produit aucun trigramme.
 */
export function trigramSimilarity(a: string, b: string): number {
  const setA = trigrams(a);
  const setB = trigrams(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const trigram of setA) {
    if (setB.has(trigram)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Indice de Jaccard sur les mots significatifs, entre 0 et 1.
 * Retourne 0 si l'un des deux textes n'a aucun mot significatif.
 */
export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  const setB = new Set(b);

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/* -------------------------------------------------------------------------- */
/* Couleurs                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Table de correspondance des libellés de couleur vers les codes canoniques.
 * Sans elle, « noir », « Noir » et « black » seraient trois couleurs différentes
 * et le signal couleur serait inutilisable.
 */
const COLOR_ALIASES: Record<string, ColorCode> = {
  noir: 'BLACK', noire: 'BLACK', black: 'BLACK',
  blanc: 'WHITE', blanche: 'WHITE', white: 'WHITE',
  gris: 'GREY', grise: 'GREY', grey: 'GREY', gray: 'GREY', argentee: 'SILVER',
  rouge: 'RED', red: 'RED', bordeaux: 'RED', rougefonce: 'RED',
  bleu: 'BLUE', bleue: 'BLUE', blue: 'BLUE',
  // Les libellés composés sont normalisés puis privés de leurs espaces :
  // « bleu marine » → « bleumarine », « bleu ciel » → « bleuciel ».
  bleumarin: 'BLUE', bleumarine: 'BLUE', bleuciel: 'BLUE', bleufonce: 'BLUE',
  bleunuit: 'BLUE', marine: 'BLUE',
  vert: 'GREEN', verte: 'GREEN', green: 'GREEN', kaki: 'GREEN',
  vertfonce: 'GREEN', vertclair: 'GREEN', vertolive: 'GREEN',
  jaune: 'YELLOW', yellow: 'YELLOW', jauneor: 'GOLD',
  orange: 'ORANGE',
  marron: 'BROWN', brun: 'BROWN', brune: 'BROWN', brown: 'BROWN', beige: 'BEIGE',
  rose: 'PINK', pink: 'PINK',
  violet: 'PURPLE', violette: 'PURPLE', purple: 'PURPLE', mauve: 'PURPLE',
  or: 'GOLD', dore: 'GOLD', doree: 'GOLD', gold: 'GOLD',
  argent: 'SILVER', silver: 'SILVER',
  multicolore: 'MULTICOLOR', multicolor: 'MULTICOLOR', arcenciel: 'MULTICOLOR',
};

/**
 * Normalise un libellé de couleur libre vers un code canonique.
 *
 * La résolution se fait en deux temps :
 *  1. correspondance exacte sur le libellé normalisé puis privé de ses espaces
 *     (« bleu marine » → `bleumarine`, « bleu ciel » → `bleuciel`) ;
 *  2. à défaut, correspondance sur le premier mot reconnu, ce qui couvre les
 *     qualificatifs libres : « vert foncé » → GREEN, « gris anthracite » → GREY.
 *
 * Retourne `UNKNOWN` si le libellé n'est pas reconnu — jamais `null`, afin que
 * l'appelant distingue « couleur non reconnue » de « couleur non renseignée ».
 */
export function normalizeColor(input: string | null | undefined): ColorCode {
  if (!input) return 'UNKNOWN';

  const normalized = normalize(input);

  const exact = COLOR_ALIASES[normalized.replace(/\s/g, '')];
  if (exact) return exact;

  for (const word of normalized.split(' ')) {
    if (word.length < 2) continue;
    const found = COLOR_ALIASES[word];
    if (found) return found;
  }

  return 'UNKNOWN';
}
