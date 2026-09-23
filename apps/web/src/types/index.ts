/**
 * Types métier de l'application Liguita.
 *
 * ⚠️ Ces types décrivent la FORME des données affichées. Les règles de calcul, elles,
 * appartiennent à `@liguita/core` : ce module ne réimplémente aucun montant.
 *
 * Le backend n'existe pas encore (ni client Supabase, ni schéma `users`). Ces types
 * anticipent donc le schéma prévu par les migrations SQL de `@liguita/db`, afin que le
 * branchement se fasse par substitution et non par réécriture.
 */

/* ========================================================================== */
/* Compte utilisateur                                                          */
/* ========================================================================== */

/**
 * ⚠️ **Il n'existe qu'un seul type de compte particulier.**
 *
 * Un même utilisateur est simultanément susceptible d'avoir perdu un objet et d'en avoir
 * trouvé un. Il n'y a donc ni « compte chercheur », ni « compte trouveur », et aucune
 * route `/dashboard/chercheur` ou `/dashboard/trouveur`. Le rôle décrit ce que la
 * personne fait à un instant donné, pas ce qu'elle est.
 */
export interface User {
  readonly id: string;
  readonly name: string;
  /** Format international, indicatif `+235` pour le Tchad. */
  readonly phone?: string;
  readonly avatarUrl?: string;
  readonly citySlug?: string;
  /** Vrai lorsque le numéro a été confirmé par code à usage unique. */
  readonly phoneVerified?: boolean;
  readonly createdAt?: string;
}

/* ========================================================================== */
/* Objets et annonces                                                          */
/* ========================================================================== */

/**
 * Nature d'une déclaration.
 *
 * `LOST` et `FOUND` ne sont pas des rôles de compte mais des attributs d'objet : la
 * même personne publie les deux, parfois le même jour.
 */
export type ItemKind = 'LOST' | 'FOUND';

/** Cycle de vie d'une déclaration. */
export type ItemStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'MATCHED'
  | 'IN_VERIFICATION'
  | 'PAID'
  | 'RETURNED'
  | 'EXPIRED'
  | 'CLOSED';

export interface Item {
  readonly id: string;
  readonly kind: ItemKind;
  /** Libellé court affiché dans les listes : « Portefeuille noir ». */
  readonly title: string;
  readonly description?: string;
  /** Identifiant d'une catégorie feuille de `@liguita/config`. */
  readonly categoryId: string;
  /**
   * Identifiant d'un type d'objet de `@liguita/config`.
   *
   * ⚠️ Ce champ est OBLIGATOIRE, et c'est une contrainte arithmétique, pas une
   * préférence : le moteur de correspondance accorde 30 points au type d'objet. Sans
   * type identique, le score plafonne à 88, sous le seuil de 90 qui déclenche une
   * correspondance « très probable ». Laisser ce champ vide rendrait la fonctionnalité
   * principale de la plateforme inatteignable.
   */
  readonly itemTypeId: string;
  readonly brand?: string;
  readonly color?: string;
  /** Libellé du lieu tel que saisi par l'utilisateur. */
  readonly placeLabel: string;
  readonly citySlug: string;
  readonly neighborhoodSlug?: string;
  /** Date de perte ou de découverte, au format ISO 8601. */
  readonly occurredAt: string;
  readonly photoUrl?: string;
  readonly status: ItemStatus;
  /** Montant en FCFA, uniquement pour les objets de classe C5. */
  readonly declaredValueXaf?: number;
  readonly createdAt: string;
}

/* ========================================================================== */
/* Correspondance et mise en relation                                          */
/* ========================================================================== */

/**
 * Étapes d'une mise en relation.
 *
 * Référence : plan v3 §5.3 — correspondance → vérification → paiement → mise en relation.
 */
export type ConnectionStatus =
  | 'MATCHED'
  | 'IN_VERIFICATION'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONNECTED'
  | 'CANCELLED';

/**
 * Détail du score de correspondance.
 *
 * Les six signaux totalisent 100 points. Les valeurs proviennent de
 * `@liguita/core/matching` : ce type ne fait que transporter le résultat.
 */
export interface MatchSignals {
  readonly type: number;
  readonly place: number;
  readonly date: number;
  readonly color: number;
  readonly brand: number;
  readonly description: number;
}

export interface MatchResult {
  readonly id: string;
  /** Déclaration à l'origine de la recherche. */
  readonly sourceItemId: string;
  /** Déclaration candidate. */
  readonly candidateItemId: string;
  readonly score: number;
  readonly signals: MatchSignals;
  readonly status: ConnectionStatus;
  readonly createdAt: string;
}

/* ========================================================================== */
/* Portefeuille                                                                */
/* ========================================================================== */

/**
 * ⚠️ **Le portefeuille distingue toujours deux soldes.**
 *
 * Un solde unique est trompeur : une récompense n'est acquise qu'après restitution
 * confirmée, et reste en attente pendant ce délai. Afficher un total sans distinguer
 * le disponible de l'attente laisserait croire à un montant retirable qui ne l'est pas.
 *
 * Invariant : `availableXaf + pendingXaf === totalXaf`.
 */
export interface Wallet {
  readonly availableXaf: number;
  readonly pendingXaf: number;
  readonly totalXaf: number;
  readonly currency: string;
}

export type TransactionKind =
  /** Récompense versée au trouveur après restitution confirmée. */
  | 'FINDER_REWARD'
  /** Frais de mise en relation payés par le propriétaire. */
  | 'CONNECTION_FEE'
  /** Rechargement du portefeuille. */
  | 'TOP_UP'
  /** Retrait vers un moyen de paiement mobile. */
  | 'PAYOUT'
  /** Bonus libre offert par le propriétaire, hors commission. */
  | 'COMMUNITY_BONUS';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Une ligne de relevé.
 *
 * `amountXaf` est **signé** : positif pour un crédit, négatif pour un débit. Le signe
 * porte l'information ; la couleur ne fait que la renforcer, afin que le relevé reste
 * lisible en niveaux de gris.
 */
export interface Transaction {
  readonly id: string;
  readonly kind: TransactionKind;
  readonly label: string;
  readonly amountXaf: number;
  readonly status: TransactionStatus;
  readonly occurredAt: string;
  /** Identifiant de la déclaration ou de la mise en relation concernée. */
  readonly referenceId?: string;
}

/* ========================================================================== */
/* Cycle de la récompense du trouveur                                          */
/* ========================================================================== */

/**
 * Étapes menant à l'acquisition d'une récompense.
 *
 *   Objet trouvé → Propriétaire identifié → Restitution → Validation → Récompense
 *   → Solde en attente → Solde disponible
 *
 * Le montant reste en attente entre `REWARD_PENDING` et `REWARD_AVAILABLE` : c'est le
 * délai de contestation. Un backend inexistant n'empêche pas de typer ce cycle
 * dès maintenant, afin que l'interface ne soit pas à réécrire le jour du branchement.
 */
export type RewardStage =
  | 'OBJECT_FOUND'
  | 'OWNER_IDENTIFIED'
  | 'RETURNED'
  | 'VALIDATED'
  | 'REWARD_PENDING'
  | 'REWARD_AVAILABLE';

export interface Reward {
  readonly id: string;
  readonly itemId: string;
  readonly beneficiaryId: string;
  readonly amountXaf: number;
  readonly stage: RewardStage;
  readonly createdAt: string;
  readonly availableAt?: string;
}

/* ========================================================================== */
/* Notifications                                                               */
/* ========================================================================== */

export type NotificationKind =
  | 'MATCH_FOUND'
  | 'ITEM_RETURNED'
  | 'CONNECTION_ACTIVATED'
  | 'PAYMENT_CONFIRMED'
  | 'REWARD_RECEIVED'
  | 'SYSTEM';

export interface AppNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: string;
  readonly isRead: boolean;
  readonly href?: string;
}

/* ========================================================================== */
/* Statistiques                                                                */
/* ========================================================================== */

/**
 * Chiffres du bandeau « Mes statistiques ».
 *
 * `rating` vaut `null` tant qu'aucune restitution n'a été notée : afficher « 0 » ou
 * « — » serait faux, un compte neuf n'a simplement pas encore de note.
 */
export interface DashboardStats {
  readonly foundCount: number;
  readonly lostCount: number;
  readonly connectionsCount: number;
  readonly rating: number | null;
  readonly ratingCount: number;
}

/* ========================================================================== */
/* Résultat de recherche intelligente                                          */
/* ========================================================================== */

/**
 * Filtres extraits d'une recherche en langage naturel.
 *
 * ⚠️ **Aucun moteur d'analyse n'existe.** Cette structure décrit ce qu'un moteur
 * produirait, afin que l'interface de résultats soit déjà en place le jour où il sera
 * branché. Tant qu'il ne l'est pas, l'extraction est explicitement simulée et signalée
 * comme telle dans l'interface — il n'y a pas de fausse intelligence artificielle.
 */
export interface ParsedQuery {
  /** Requête brute saisie par l'utilisateur. */
  readonly raw: string;
  readonly itemTypeId?: string;
  readonly categoryId?: string;
  readonly brand?: string;
  readonly color?: string;
  readonly placeLabel?: string;
  readonly neighborhoodSlug?: string;
  /** Date relative résolue (« hier » → date ISO). */
  readonly occurredAt?: string;
  readonly kind?: ItemKind;
  /** Vrai lorsque l'extraction est simulée faute de moteur réel. */
  readonly isSimulated: boolean;
}
