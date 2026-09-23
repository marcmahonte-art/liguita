/**
 * Grille tarifaire canonique — Tchad, version 1.
 *
 * ⚠️ Cette constante est un RÉFÉRENTIEL DE DÉVELOPPEMENT ET DE TEST.
 * En production, la grille active est lue depuis la table `pricing_rules` (une seule version
 * active par pays, cf. plan v3 §5.5). Cette copie doit rester synchronisée avec le seed SQL.
 *
 * Calibrage : docs/Liguita_Grille_Tarifaire.xlsx, onglet « Calibrage marché ».
 *   · Coût de remplacement d'une CNI : 5 000 – 10 000 FCFA
 *   · Passeport biométrique : 60 000 FCFA · Permis de conduire : 25 000 FCFA
 *   · SMIG mensuel : 60 000 FCFA
 *   · Téléphone entrée/milieu de gamme : 60 000 – 160 000 FCFA
 *   · Frontière C3 → C4 : ≈ 200 000 FCFA (smartphone), ≈ 600 000 FCFA (ordinateur portable)
 */

import type { PricingRule } from './types';

export const PRICING_RULE_V1: PricingRule = {
  id: 'td-v1',
  version: 1,
  countryCode: 'TD',
  currency: 'XAF',

  fees: {
    C1: 300,
    C2: 700,
    C3: 1_200,
    C4: 3_000,
    C5: 0, // calculé depuis la valeur déclarée
  },

  rewards: {
    C1: 100,
    C2: 250,
    C3: 400,
    C4: 900,
    C5: 0, // calculé
  },

  c5: {
    rate: 0.01,
    floor: 5_000,
    ceiling: 25_000,
    rewardRate: 0.3,
  },

  urgentRate: 0.5,
  conciergerieFee: 1_000,

  /**
   * ⚠️ PROXY — aucun tarif de livraison urbaine n'est publié à N'Djamena.
   * Valeur à remplacer par un devis réel (Nimvi Express, Kimre, Speed Delivery)
   * avant d'activer l'option en production.
   */
  deliveryFee: 2_500,
  deliveryIsProxy: true,

  /** À valider par un comptable tchadien avant le Sprint 6. */
  vatRate: 0.18,
  commissionIsHt: true,

  classUpgradeThresholds: {
    C5: 1_000_000,
  },

  /**
   * Bandes de valeur globales : classe minimale selon la valeur déclarée,
   * toutes catégories confondues. Elles complètent la classe par défaut de la catégorie
   * sans jamais la réduire.
   */
  valueBands: [
    { upTo: 60_000, pricingClass: 'C1' },
    { upTo: 100_000, pricingClass: 'C2' },
    { upTo: 300_000, pricingClass: 'C3' },
    { upTo: Number.POSITIVE_INFINITY, pricingClass: 'C4' },
  ],
};
