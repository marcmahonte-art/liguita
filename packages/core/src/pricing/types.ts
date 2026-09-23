/**
 * Moteur de tarification — types.
 *
 * Référence métier : docs/Liguita_Plan_Implementation_v3.md §5
 * Source tarifaire : docs/Liguita_Grille_Tarifaire.xlsx
 */

/** Classe tarifaire d'un objet (C1 à C5). */
export type PricingClass = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

/** Options payantes pouvant s'ajouter aux frais de base. */
export type PricingOptionCode = 'URGENT' | 'CONCIERGERIE' | 'DELIVERY';

/** Bénéficiaire final d'une ligne de facturation. */
export type Payee = 'LIGUITA' | 'FINDER' | 'PARTNER';

/** Origine de la classe retenue, conservée pour l'auditabilité. */
export type ClassSource = 'CATEGORY' | 'DECLARED_VALUE' | 'MANUAL';

/**
 * Bande de valeur globale, utilisée pour déterminer la classe minimale d'un objet
 * à partir de sa valeur déclarée. Les bandes sont ordonnées par `upTo` croissant.
 */
export interface ValueBand {
  /** Borne supérieure inclusive de la bande. */
  readonly upTo: number;
  readonly pricingClass: PricingClass;
}

/**
 * Version d'une grille tarifaire.
 *
 * Immuable : une modification de grille crée une nouvelle version, elle n'écrase jamais
 * la précédente. Un devis émis référence la version appliquée au moment de son calcul.
 */
export interface PricingRule {
  readonly id: string;
  readonly version: number;
  readonly countryCode: string;
  readonly currency: string;

  /** Frais de base par classe, en unité monétaire entière. C5 est calculé, la valeur ici est ignorée. */
  readonly fees: Record<PricingClass, number>;

  /** Récompense du trouveur par classe. C5 est calculé. */
  readonly rewards: Record<PricingClass, number>;

  /** Paramètres spécifiques à la classe C5 (pourcentage borné). */
  readonly c5: {
    /** Taux appliqué à la valeur déclarée (0,01 = 1 %). */
    readonly rate: number;
    /** Plancher des frais C5. */
    readonly floor: number;
    /** Plafond des frais C5. */
    readonly ceiling: number;
    /** Part des frais reversée au trouveur (0,30 = 30 %). */
    readonly rewardRate: number;
  };

  /** Supplément d'urgence, exprimé en fraction des frais de base (0,50 = +50 %). */
  readonly urgentRate: number;
  /** Montant fixe de la conciergerie documents. */
  readonly conciergerieFee: number;
  /** Montant de la livraison urbaine. */
  readonly deliveryFee: number;
  /**
   * Vrai si `deliveryFee` est une estimation non contractuelle.
   * Tant que ce drapeau est vrai, l'option livraison doit rester désactivée en production.
   */
  readonly deliveryIsProxy: boolean;

  /** Taux de TVA (0,18 = 18 %). */
  readonly vatRate: number;
  /** Vrai si la commission est exprimée hors taxes. */
  readonly commissionIsHt: boolean;

  /**
   * Seuils de valeur déclarée faisant basculer un objet vers une classe supérieure.
   * Le seuil C5 (1 000 000 FCFA) est le seul seuil absolu ; les autres bascules dépendent
   * du plafond propre à chaque catégorie (`CategoryRef.maxValueXaf`).
   */
  readonly classUpgradeThresholds: Partial<Record<PricingClass, number>>;

  /**
   * Bandes de valeur globales, ordonnées par `upTo` croissant.
   *
   * Elles fixent la classe MINIMALE d'un objet d'après sa valeur déclarée, toutes
   * catégories confondues. Elles complètent — sans jamais la remplacer — la classe par
   * défaut de la catégorie et la montée d'un cran au-delà du plafond de la catégorie.
   */
  readonly valueBands: readonly ValueBand[];
}

/** Référence minimale d'une catégorie, telle qu'utilisée par le classement. */
export interface CategoryRef {
  readonly id: string;
  readonly defaultClass: PricingClass;
  /**
   * Valeur maximale usuelle des objets de cette catégorie.
   * Au-delà, l'objet monte d'une classe. `null` = pas de borne connue.
   */
  readonly maxValueXaf: number | null;
}

/** Entrée du calcul de frais. */
export interface FeeInput {
  readonly rule: PricingRule;
  readonly category: CategoryRef;
  /** Valeur déclarée par le propriétaire, facultative. */
  readonly declaredValueXaf?: number | null;
  readonly options?: readonly PricingOptionCode[];
  /** Bonus libre pour le trouveur. Liguita ne prélève aucune commission dessus. */
  readonly communityBonusXaf?: number;
}

/** Une ligne du détail affiché à l'utilisateur. */
export interface FeeLine {
  readonly code: string;
  readonly labelFr: string;
  readonly amount: number;
  readonly payee: Payee;
}

/** Résultat complet et figé du calcul. */
export interface FeeBreakdown {
  readonly pricingClass: PricingClass;
  readonly classSource: ClassSource;

  readonly baseFee: number;
  readonly urgentFee: number;
  readonly conciergerieFee: number;
  readonly deliveryFee: number;
  readonly communityBonus: number;

  /** Somme réellement payée par le propriétaire. */
  readonly totalAmount: number;
  /** Montant reversé au trouveur (hors bonus communautaire). */
  readonly rewardAmount: number;
  /** Part conservée par Liguita. */
  readonly liguitaCommission: number;
  /** Montant reversé au partenaire de livraison. */
  readonly deliveryPayout: number;
  /** TVA extraite de la commission (commission affichée hors taxes). */
  readonly vatAmount: number;

  readonly currency: string;
  readonly ruleId: string;
  readonly ruleVersion: number;
  readonly lines: readonly FeeLine[];
}

/**
 * Erreur de tarification.
 *
 * Le message commence toujours par `[CODE]` afin de rester filtrable dans les journaux
 * tout en restant lisible par un humain.
 */
export class PricingError extends Error {
  constructor(
    public readonly code: PricingErrorCode,
    message?: string,
  ) {
    super(message ? `[${code}] ${message}` : `[${code}]`);
    this.name = 'PricingError';
  }
}

export type PricingErrorCode =
  | 'C5_REQUIRES_DECLARED_VALUE'
  | 'NEGATIVE_COMMISSION'
  | 'NON_POSITIVE_REWARD'
  | 'BREAKDOWN_MISMATCH';
