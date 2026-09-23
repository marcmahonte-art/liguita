/**
 * Données de démonstration.
 *
 * ⚠️⚠️ **TOUT CE FICHIER EST FICTIF.** ⚠️⚠️
 *
 * Le backend n'existe pas encore : ni client Supabase, ni schéma `users`, ni table de
 * transactions. Ces données permettent de construire et de valider les interfaces
 * Home et Dashboard sans attendre. Elles sont signalées comme telles dans l'interface
 * par le composant `<DemoDataBanner />`, afin qu'aucune capture d'écran ne puisse faire
 * passer ces chiffres pour des chiffres réels.
 *
 * Deux principes tenus ici :
 *
 *  1. **Aucun montant n'est écrit en dur.** Les frais de mise en relation et les
 *     récompenses sont calculés par `@liguita/core/pricing` depuis le référentiel réel
 *     de `@liguita/config`. Une grille tarifaire modifiée met ces données à jour.
 *
 *  2. **Le portefeuille est dérivé du relevé**, jamais saisi séparément. Le solde
 *     disponible est la somme des crédits confirmés moins celle des débits confirmés.
 *     Le solde en attente est la somme des crédits non encore confirmés. Un solde saisi
 *     à la main finit toujours par contredire le relevé qu'il est censé résumer.
 */

import type {
  AppNotification,
  DashboardStats,
  Item,
  Transaction,
  User,
  Wallet,
} from '../types';
import { connectionFeeFor, finderRewardFor } from './pricing-examples';

/** Marqueur unique : à basculer sur `false` le jour du branchement du backend. */
export const IS_DEMO_DATA = true;

/* ========================================================================== */
/* Compte                                                                      */
/* ========================================================================== */

export const MOCK_USER: User = {
  id: 'demo-user-1',
  name: 'Moussa',
  phone: '+235 66 12 34 56',
  citySlug: 'ndjamena',
  phoneVerified: true,
};

/* ========================================================================== */
/* Déclarations                                                                */
/* ========================================================================== */

/**
 * Les activités récentes du tableau de bord.
 *
 * Les identifiants de catégorie et de type d'objet proviennent du référentiel réel :
 * le jour du branchement, il suffira de remplacer la source, pas la forme.
 */
export const MOCK_ITEMS: readonly Item[] = [
  {
    id: 'item-1',
    kind: 'FOUND',
    title: 'Portefeuille noir',
    description: 'Portefeuille en cuir noir contenant des cartes et un peu d\u2019espèces.',
    categoryId: 'bag-wallet',
    itemTypeId: 'wallet',
    color: 'noir',
    placeLabel: 'Marché de Moursal',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'moursal',
    occurredAt: '2026-09-22T09:20:00.000Z',
    status: 'PUBLISHED',
    createdAt: '2026-09-22T10:05:00.000Z',
  },
  {
    id: 'item-2',
    kind: 'LOST',
    title: 'iPhone 13',
    description: 'Coque transparente, écran légèrement rayé dans le coin supérieur droit.',
    categoryId: 'phone-smartphone',
    itemTypeId: 'smartphone',
    brand: 'Apple',
    color: 'noir',
    placeLabel: 'Quartier Farcha',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'farcha',
    occurredAt: '2026-09-21T17:40:00.000Z',
    status: 'MATCHED',
    createdAt: '2026-09-21T18:12:00.000Z',
  },
  {
    id: 'item-3',
    kind: 'LOST',
    title: 'Carte nationale d\u2019identité',
    description: 'Carte au nom de Moussa Abdelkerim, délivrée en 2024.',
    categoryId: 'doc-national-id',
    itemTypeId: 'national-id-card',
    placeLabel: 'Centre-ville',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'klemat',
    occurredAt: '2026-09-18T11:00:00.000Z',
    status: 'IN_VERIFICATION',
    createdAt: '2026-09-18T11:30:00.000Z',
  },
  {
    id: 'item-4',
    kind: 'FOUND',
    title: 'Clés de voiture',
    description: 'Trousseau de trois clés avec une breloque en cuir.',
    categoryId: 'keys',
    itemTypeId: 'car-keys',
    placeLabel: 'Avenue Charles de Gaulle',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'chagoua',
    occurredAt: '2026-09-15T07:10:00.000Z',
    status: 'RETURNED',
    createdAt: '2026-09-15T07:45:00.000Z',
  },
];

/* ========================================================================== */
/* Relevé et portefeuille                                                      */
/* ========================================================================== */

/**
 * Relevé du portefeuille.
 *
 * Les montants proviennent du moteur : `finderRewardFor('C1')` vaut 100 FCFA,
 * `connectionFeeFor('C1')` vaut 300 FCFA. Ces valeurs suivent la grille tarifaire.
 *
 * ⚠️ La maquette citait 500 FCFA de frais et 100 FCFA de récompense. Le commanditaire
 * a choisi de conserver la grille C1–C5 : les frais dépendent donc de la classe de
 * l'objet, et non d'un forfait unique.
 */
const REWARD_C1 = finderRewardFor('C1') ?? 100;
const REWARD_C2 = finderRewardFor('C2') ?? 250;
const REWARD_C3 = finderRewardFor('C3') ?? 400;
const FEE_C1 = connectionFeeFor('C1') ?? 300;

export const MOCK_TRANSACTIONS: readonly Transaction[] = [
  {
    id: 'tx-1',
    kind: 'FINDER_REWARD',
    label: 'Récompense trouveur',
    amountXaf: REWARD_C1,
    status: 'PENDING',
    occurredAt: '2026-09-22T10:05:00.000Z',
    referenceId: 'item-1',
  },
  {
    id: 'tx-2',
    kind: 'FINDER_REWARD',
    label: 'Récompense trouveur',
    amountXaf: REWARD_C3,
    status: 'COMPLETED',
    occurredAt: '2026-09-15T16:20:00.000Z',
    referenceId: 'item-4',
  },
  {
    id: 'tx-3',
    kind: 'CONNECTION_FEE',
    label: 'Frais de mise en relation',
    amountXaf: -FEE_C1,
    status: 'COMPLETED',
    occurredAt: '2026-09-18T12:02:00.000Z',
    referenceId: 'item-3',
  },
  {
    id: 'tx-4',
    kind: 'TOP_UP',
    label: 'Recharge portefeuille',
    amountXaf: 2_000,
    status: 'COMPLETED',
    occurredAt: '2026-09-12T08:30:00.000Z',
  },
  {
    id: 'tx-5',
    kind: 'FINDER_REWARD',
    label: 'Récompense trouveur',
    amountXaf: REWARD_C2,
    status: 'COMPLETED',
    occurredAt: '2026-09-04T14:00:00.000Z',
  },
];

/**
 * Portefeuille **dérivé** du relevé ci-dessus.
 *
 * ⚠️ Ne jamais saisir ces montants à la main : ils doivent rester la conséquence du
 * relevé. Un portefeuille saisi séparément finit par contredire ses propres lignes.
 *
 * Note sur les chiffres de la maquette : elle annonçait « 2 350 FCFA » au total pour
 * « 1 250 disponibles + 100 en attente », ce qui ne s'additionne pas. Les valeurs
 * ci-dessous sont calculées, donc cohérentes par construction.
 */
export function buildWallet(transactions: readonly Transaction[]): Wallet {
  const confirmedCredits = transactions
    .filter((tx) => tx.status === 'COMPLETED' && tx.amountXaf > 0)
    .reduce((sum, tx) => sum + tx.amountXaf, 0);

  const confirmedDebits = transactions
    .filter((tx) => tx.status === 'COMPLETED' && tx.amountXaf < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amountXaf), 0);

  const pendingXaf = transactions
    .filter((tx) => tx.status === 'PENDING' && tx.amountXaf > 0)
    .reduce((sum, tx) => sum + tx.amountXaf, 0);

  const availableXaf = confirmedCredits - confirmedDebits;

  return {
    availableXaf,
    pendingXaf,
    totalXaf: availableXaf + pendingXaf,
    currency: 'XAF',
  };
}

export const MOCK_WALLET: Wallet = buildWallet(MOCK_TRANSACTIONS);

/* ========================================================================== */
/* Notifications                                                               */
/* ========================================================================== */

export const MOCK_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'notif-1',
    kind: 'MATCH_FOUND',
    title: 'Votre objet a été retrouvé !',
    description: 'Un portefeuille noir correspondant à votre déclaration a été signalé à Moursal.',
    occurredAt: '2026-09-22T10:10:00.000Z',
    isRead: false,
    href: '/dashboard/objects',
  },
  {
    id: 'notif-2',
    kind: 'MATCH_FOUND',
    title: 'Nouvelle correspondance',
    description: 'Une correspondance à 92 % a été détectée pour votre iPhone 13.',
    occurredAt: '2026-09-21T18:40:00.000Z',
    isRead: false,
    href: '/dashboard/objects',
  },
  {
    id: 'notif-3',
    kind: 'CONNECTION_ACTIVATED',
    title: 'Mise en relation activée',
    description: 'Vous pouvez désormais contacter la personne qui détient l\u2019objet.',
    occurredAt: '2026-09-18T12:05:00.000Z',
    isRead: true,
    href: '/dashboard/transactions',
  },
  {
    id: 'notif-4',
    kind: 'PAYMENT_CONFIRMED',
    title: 'Votre paiement a été confirmé',
    description: 'Les frais de mise en relation ont été réglés. La mise en relation est ouverte.',
    occurredAt: '2026-09-18T12:02:00.000Z',
    isRead: true,
    href: '/dashboard/transactions',
  },
  {
    id: 'notif-5',
    kind: 'REWARD_RECEIVED',
    title: 'Récompense reçue',
    description: 'Votre récompense de trouveur est en attente de validation de la restitution.',
    occurredAt: '2026-09-15T16:25:00.000Z',
    isRead: true,
    href: '/dashboard/wallet',
  },
];

export function countUnread(notifications: readonly AppNotification[]): number {
  return notifications.filter((notification) => !notification.isRead).length;
}

/* ========================================================================== */
/* Statistiques                                                                */
/* ========================================================================== */

export const MOCK_STATS: DashboardStats = {
  foundCount: 3,
  lostCount: 5,
  connectionsCount: 2,
  rating: 4.8,
  ratingCount: 12,
};

/**
 * Chiffres de la page d'accueil publique.
 *
 * ⚠️ Inventés, comme le reste de ce fichier. Ils ne doivent pas être publiés en l'état :
 * une plateforme qui annonce des chiffres d'usage inexistants perd la confiance de ses
 * premiers utilisateurs, et c'est précisément le public qu'elle ne peut pas se permettre
 * de perdre. À remplacer par des comptages réels avant l'ouverture.
 */
export const MOCK_PUBLIC_STATS = [
  { value: '1 240', label: 'Objets déclarés' },
  { value: '318', label: 'Restitutions confirmées' },
  { value: '6', label: 'Villes couvertes' },
  { value: '48 h', label: 'Délai moyen de restitution' },
] as const;

/* ========================================================================== */
/* Aperçu Liguita Business                                                     */
/* ========================================================================== */

export const MOCK_BUSINESS_PREVIEW = {
  organisation: 'Aéroport International Hassan Djamous',
  period: 'Septembre 2026',
  kpis: [
    { label: 'Objets enregistrés', value: '47', trend: '+12' },
    { label: 'Restitués', value: '31', trend: '+8' },
    { label: 'En attente', value: '16', trend: '−4' },
  ],
  rows: [
    { object: 'Valise rigide bleue', zone: 'Terminal 1', status: 'Restitué', days: 2 },
    { object: 'Passeport', zone: 'Contrôle police', status: 'En attente', days: 5 },
    { object: 'Ordinateur portable', zone: 'Salle d\u2019embarquement', status: 'Restitué', days: 1 },
    { object: 'Sac de cabine', zone: 'Zone de réclamation', status: 'En attente', days: 9 },
  ],
} as const;
