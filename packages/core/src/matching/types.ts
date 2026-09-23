/**
 * Moteur de correspondance — types.
 *
 * Référence métier : docs/Liguita_Plan_Implementation_v3.md §6
 */

/** Niveau de confiance d'une correspondance. */
export type MatchLevel = 'VERY_LIKELY' | 'POSSIBLE' | 'WEAK';

/** Codes couleur canoniques. Toute couleur libre est normalisée vers l'un de ces codes. */
export type ColorCode =
  | 'BLACK'
  | 'WHITE'
  | 'GREY'
  | 'RED'
  | 'BLUE'
  | 'GREEN'
  | 'YELLOW'
  | 'ORANGE'
  | 'BROWN'
  | 'PINK'
  | 'PURPLE'
  | 'GOLD'
  | 'SILVER'
  | 'BEIGE'
  | 'MULTICOLOR'
  | 'UNKNOWN';

/** Signaux comparés entre une déclaration de perte et une déclaration de trouvaille. */
export interface MatchSignals {
  readonly itemTypeId: string | null;
  readonly categoryId: string;
  readonly parentCategoryId: string | null;
  readonly placeId: string | null;
  readonly neighborhoodId: string | null;
  readonly cityId: string | null;
  readonly countryCode: string;
  readonly colorCode: ColorCode | null;
  readonly brand: string | null;
  readonly description: string | null;
}

/** Côté « perdu » — porte la date de perte. */
export interface LostSide extends MatchSignals {
  readonly lostAt: Date;
}

/** Côté « trouvé » — porte la date de découverte. */
export interface FoundSide extends MatchSignals {
  readonly foundAt: Date;
}

/** Détail du score par signal, conservé en base pour analyser les faux positifs. */
export interface MatchBreakdown {
  readonly type: number;
  readonly place: number;
  readonly date: number;
  readonly color: number;
  readonly brand: number;
  readonly description: number;
}

export interface MatchResult {
  /** Score de 0 à 100. */
  readonly score: number;
  readonly level: MatchLevel;
  readonly breakdown: MatchBreakdown;
}

/**
 * Seuils de décision.
 *
 * · score >= 90 : correspondance très probable → notification immédiate des deux parties
 * · score >= 70 : correspondance possible    → notification du propriétaire
 * · score >= 55 : correspondance faible      → persistée, aucune notification
 * · score <  55 : bruit                      → non persistée
 */
export const MATCH_THRESHOLDS = {
  veryLikely: 90,
  possible: 70,
  persist: 55,
} as const;

/**
 * Pondérations des signaux. Elles somment à 100, ce qui permet de calculer
 * directement `score = Σ (poids × similarité)`.
 */
export const MATCH_WEIGHTS = {
  type: 30,
  place: 25,
  date: 15,
  color: 10,
  brand: 10,
  description: 10,
} as const;

/**
 * Valeur attribuée à un signal non renseigné.
 *
 * Règle des données manquantes : un champ vide vaut NEUTRE (0,5), jamais 0.
 * Sinon une annonce pauvre en informations serait mécaniquement pénalisée, alors que
 * c'est le cas le plus fréquent sur le terrain. Une annonce complète doit gagner,
 * pas une annonce vide perdre.
 */
export const NEUTRAL_SIMILARITY = 0.5;

/** Fenêtre temporelle au-delà de laquelle le signal date vaut zéro. */
export const DATE_WINDOW_DAYS = 30;
