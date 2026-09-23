import { describe, expect, it } from 'vitest';

import { computeFee } from '../compute';
import { PRICING_RULE_V1 } from '../default-rule';
import { formatMoney, parseAmount } from '../format';
import { extractVat, round50, round100 } from '../round';
import { PricingError, type CategoryRef, type PricingOptionCode } from '../types';

/* -------------------------------------------------------------------------- */
/* Catégories de test — plafonds issus de l'onglet « Calibrage marché »        */
/* -------------------------------------------------------------------------- */

const CATEGORIES = {
  /** Carte d'identité, passeport, permis : remplacement officiel 5 000 – 60 000 FCFA. */
  documents: { id: 'documents', defaultClass: 'C1', maxValueXaf: 60_000 } as CategoryRef,
  /** Portefeuille, clés, lunettes. */
  personal: { id: 'personal', defaultClass: 'C2', maxValueXaf: 80_000 } as CategoryRef,
  /** Téléphone entrée / milieu de gamme : 60 000 – 160 000 FCFA. */
  phone: { id: 'phone-mid', defaultClass: 'C3', maxValueXaf: 200_000 } as CategoryRef,
  /** Ordinateur portable : bascule C3 → C4 observée à 600 000 FCFA. */
  laptop: { id: 'laptop', defaultClass: 'C3', maxValueXaf: 600_000 } as CategoryRef,
  /** Sac ou article de marque : 150 000 – 1 000 000 FCFA. */
  luxury: { id: 'luxury', defaultClass: 'C4', maxValueXaf: 1_000_000 } as CategoryRef,
  /**
   * Catégorie C5 par nature — lot d'entreprise, véhicule.
   * Sa classe ne dépend pas de la valeur déclarée : c'est le seul chemin qui rend le
   * plancher C5 (5 000 FCFA) effectivement atteignable.
   */
  special: { id: 'special-lot', defaultClass: 'C5', maxValueXaf: null } as CategoryRef,
} satisfies Record<string, CategoryRef>;

/* -------------------------------------------------------------------------- */
/* Cas de test dorés — plan v3 §5.7                                           */
/*                                                                            */
/* Ces 18 cas sont la suite de référence du moteur. Toute modification du      */
/* moteur doit les faire passer SANS EN MODIFIER AUCUN. Si un cas doit         */
/* changer, c'est une décision produit qui exige une nouvelle version de       */
/* `pricing_rules` — jamais un ajustement silencieux du test.                  */
/* -------------------------------------------------------------------------- */

interface GoldenCase {
  readonly n: number;
  readonly label: string;
  readonly category: CategoryRef;
  readonly declaredValueXaf?: number;
  readonly options?: readonly PricingOptionCode[];
  readonly communityBonusXaf?: number;
  readonly base: number;
  readonly urgent: number;
  readonly conciergerie: number;
  readonly delivery: number;
  readonly total: number;
  readonly reward: number;
  readonly commission: number;
  readonly vat: number;
}

const GOLDEN_CASES: readonly GoldenCase[] = [
  { n: 1, label: 'C1 — carte d’identité, standard', category: CATEGORIES.documents, base: 300, urgent: 0, conciergerie: 0, delivery: 0, total: 300, reward: 100, commission: 200, vat: 31 },
  { n: 2, label: 'C1 — urgent', category: CATEGORIES.documents, options: ['URGENT'], base: 300, urgent: 150, conciergerie: 0, delivery: 0, total: 450, reward: 100, commission: 350, vat: 53 },
  { n: 3, label: 'C1 — conciergerie documents', category: CATEGORIES.documents, options: ['CONCIERGERIE'], base: 300, urgent: 0, conciergerie: 1000, delivery: 0, total: 1300, reward: 100, commission: 1200, vat: 183 },
  { n: 4, label: 'C1 — bonus communautaire de 1 000', category: CATEGORIES.documents, communityBonusXaf: 1000, base: 300, urgent: 0, conciergerie: 0, delivery: 0, total: 1300, reward: 100, commission: 200, vat: 31 },
  { n: 5, label: 'C2 — effets personnels, standard', category: CATEGORIES.personal, base: 700, urgent: 0, conciergerie: 0, delivery: 0, total: 700, reward: 250, commission: 450, vat: 69 },
  { n: 6, label: 'C2 — urgent', category: CATEGORIES.personal, options: ['URGENT'], base: 700, urgent: 350, conciergerie: 0, delivery: 0, total: 1050, reward: 250, commission: 800, vat: 122 },
  { n: 7, label: 'C3 — téléphone, standard', category: CATEGORIES.phone, base: 1200, urgent: 0, conciergerie: 0, delivery: 0, total: 1200, reward: 400, commission: 800, vat: 122 },
  { n: 8, label: 'C3 — urgent', category: CATEGORIES.phone, options: ['URGENT'], base: 1200, urgent: 600, conciergerie: 0, delivery: 0, total: 1800, reward: 400, commission: 1400, vat: 214 },
  { n: 9, label: 'C3 — conciergerie', category: CATEGORIES.phone, options: ['CONCIERGERIE'], base: 1200, urgent: 0, conciergerie: 1000, delivery: 0, total: 2200, reward: 400, commission: 1800, vat: 275 },
  { n: 10, label: 'C3 — livraison urbaine', category: CATEGORIES.phone, options: ['DELIVERY'], base: 1200, urgent: 0, conciergerie: 0, delivery: 2500, total: 3700, reward: 400, commission: 800, vat: 122 },
  { n: 11, label: 'C3 — urgent + livraison', category: CATEGORIES.phone, options: ['URGENT', 'DELIVERY'], base: 1200, urgent: 600, conciergerie: 0, delivery: 2500, total: 4300, reward: 400, commission: 1400, vat: 214 },
  { n: 12, label: 'C4 — sac de marque, standard', category: CATEGORIES.luxury, base: 3000, urgent: 0, conciergerie: 0, delivery: 0, total: 3000, reward: 900, commission: 2100, vat: 320 },
  { n: 13, label: 'C4 — urgent', category: CATEGORIES.luxury, options: ['URGENT'], base: 3000, urgent: 1500, conciergerie: 0, delivery: 0, total: 4500, reward: 900, commission: 3600, vat: 549 },
  { n: 14, label: 'C5 — lot d’entreprise 1 500 000', category: CATEGORIES.luxury, declaredValueXaf: 1_500_000, base: 15000, urgent: 0, conciergerie: 0, delivery: 0, total: 15000, reward: 4500, commission: 10500, vat: 1602 },
  { n: 15, label: 'C5 — lot d’entreprise 1 500 000 + urgent', category: CATEGORIES.luxury, declaredValueXaf: 1_500_000, options: ['URGENT'], base: 15000, urgent: 7500, conciergerie: 0, delivery: 0, total: 22500, reward: 4500, commission: 18000, vat: 2746 },
  { n: 16, label: 'C5 — plancher à 5 000 (lot déclaré 200 000)', category: CATEGORIES.special, declaredValueXaf: 200_000, base: 5000, urgent: 0, conciergerie: 0, delivery: 0, total: 5000, reward: 1500, commission: 3500, vat: 534 },
  { n: 17, label: 'C5 — plafond à 25 000 (lot déclaré 5 000 000)', category: CATEGORIES.special, declaredValueXaf: 5_000_000, base: 25000, urgent: 0, conciergerie: 0, delivery: 0, total: 25000, reward: 7500, commission: 17500, vat: 2669 },
  { n: 18, label: 'C5 — urgent + conciergerie + livraison', category: CATEGORIES.luxury, declaredValueXaf: 1_500_000, options: ['URGENT', 'CONCIERGERIE', 'DELIVERY'], base: 15000, urgent: 7500, conciergerie: 1000, delivery: 2500, total: 26000, reward: 4500, commission: 19000, vat: 2898 },
];

describe('moteur de tarification — 18 cas dorés', () => {
  it.each(GOLDEN_CASES)('cas $n — $label', (c) => {
    const result = computeFee({
      rule: PRICING_RULE_V1,
      category: c.category,
      declaredValueXaf: c.declaredValueXaf ?? null,
      options: c.options ?? [],
      communityBonusXaf: c.communityBonusXaf ?? 0,
    });

    expect({
      base: result.baseFee,
      urgent: result.urgentFee,
      conciergerie: result.conciergerieFee,
      delivery: result.deliveryFee,
      total: result.totalAmount,
      reward: result.rewardAmount,
      commission: result.liguitaCommission,
      vat: result.vatAmount,
    }).toEqual({
      base: c.base,
      urgent: c.urgent,
      conciergerie: c.conciergerie,
      delivery: c.delivery,
      total: c.total,
      reward: c.reward,
      commission: c.commission,
      vat: c.vat,
    });
  });

  it('respecte l’invariant de répartition sur les 18 cas', () => {
    for (const c of GOLDEN_CASES) {
      const r = computeFee({
        rule: PRICING_RULE_V1,
        category: c.category,
        declaredValueXaf: c.declaredValueXaf ?? null,
        options: c.options ?? [],
        communityBonusXaf: c.communityBonusXaf ?? 0,
      });

      // versement trouveur + bonus + commission + partenaire = total payé
      expect(r.rewardAmount + r.communityBonus + r.liguitaCommission + r.deliveryPayout).toBe(
        r.totalAmount,
      );
      expect(r.liguitaCommission).toBeGreaterThanOrEqual(0);
      expect(r.rewardAmount).toBeGreaterThan(0);
    }
  });

  it('le supplément d’urgence alimente la commission, pas la récompense', () => {
    const standard = computeFee({ rule: PRICING_RULE_V1, category: CATEGORIES.phone });
    const urgent = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.phone,
      options: ['URGENT'],
    });

    expect(urgent.rewardAmount).toBe(standard.rewardAmount);
    expect(urgent.liguitaCommission - standard.liguitaCommission).toBe(600);
  });

  it('la livraison est intégralement reversée au partenaire', () => {
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.phone,
      options: ['DELIVERY'],
    });
    expect(r.deliveryPayout).toBe(PRICING_RULE_V1.deliveryFee);
    expect(r.liguitaCommission).toBe(800); // inchangée
  });

  it('le bonus communautaire ne génère aucune commission', () => {
    const withoutBonus = computeFee({ rule: PRICING_RULE_V1, category: CATEGORIES.documents });
    const withBonus = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.documents,
      communityBonusXaf: 5_000,
    });

    expect(withBonus.liguitaCommission).toBe(withoutBonus.liguitaCommission);
    expect(withBonus.totalAmount - withoutBonus.totalAmount).toBe(5_000);
  });
});

/* -------------------------------------------------------------------------- */
/* Classement                                                                  */
/* -------------------------------------------------------------------------- */

describe('classement automatique', () => {
  it('utilise la classe par défaut de la catégorie sans valeur déclarée', () => {
    const r = computeFee({ rule: PRICING_RULE_V1, category: CATEGORIES.phone });
    expect(r.pricingClass).toBe('C3');
    expect(r.classSource).toBe('CATEGORY');
  });

  it('monte d’un cran quand la valeur dépasse le plafond de la catégorie', () => {
    // Téléphone déclaré à 250 000 > plafond de la catégorie (200 000) → C4
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.phone,
      declaredValueXaf: 250_000,
    });
    expect(r.pricingClass).toBe('C4');
    expect(r.classSource).toBe('DECLARED_VALUE');
    expect(r.baseFee).toBe(3_000);
  });

  it('respecte le plafond propre à chaque catégorie', () => {
    // 250 000 dépasse le plafond d'un téléphone (200 000) mais pas celui d'un ordinateur
    // portable (600 000) : la même valeur donne donc deux classes différentes.
    const phone = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.phone,
      declaredValueXaf: 250_000,
    });
    const laptop = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.laptop,
      declaredValueXaf: 250_000,
    });

    expect(phone.pricingClass).toBe('C4');
    expect(laptop.pricingClass).toBe('C3');
  });

  it('applique la bande de valeur globale en complément de la catégorie', () => {
    // Carte d'identité (C1) déclarée à 500 000 FCFA : la catégorie ne monterait qu'à C2,
    // mais la bande globale place toute valeur de 300 000 à 1 000 000 en C4.
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.documents,
      declaredValueXaf: 500_000,
    });
    expect(r.pricingClass).toBe('C4');
  });

  it('bascule en C5 au-delà de 1 000 000 FCFA, quelle que soit la catégorie', () => {
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.documents,
      declaredValueXaf: 1_000_001,
    });
    expect(r.pricingClass).toBe('C5');
  });

  it('ne déclasse jamais : une valeur faible ne fait pas baisser la classe', () => {
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.luxury,
      declaredValueXaf: 1_000,
    });
    expect(r.pricingClass).toBe('C4');
    expect(r.baseFee).toBe(3_000);
  });

  it('ignore une valeur déclarée nulle ou négative', () => {
    const zero = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.documents,
      declaredValueXaf: 0,
    });
    const negative = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.documents,
      declaredValueXaf: -5_000,
    });
    expect(zero.pricingClass).toBe('C1');
    expect(negative.pricingClass).toBe('C1');
  });

  it('conserve la classe C5 d’une catégorie C5 par nature, même sans valeur déclarée', () => {
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.special,
      declaredValueXaf: 200_000,
    });
    expect(r.pricingClass).toBe('C5');
    expect(r.baseFee).toBe(5_000);
  });

  it('documente le seul chemin menant au plancher C5', () => {
    // ⚠️ Constat d’implémentation : le seuil de bascule vers C5 étant fixé à 1 000 000 FCFA,
    // une valeur déclarée qui déclenche C5 produit toujours des frais de 1 % × valeur,
    // soit AU MOINS 10 000 FCFA. Le plancher de 5 000 FCFA n’est donc JAMAIS atteint par
    // le seul jeu de la valeur déclarée.
    //
    // Il ne devient atteignable que par une catégorie dont la classe par défaut est C5
    // (lot d’entreprise, véhicule, matériel spécialisé), et uniquement pour une valeur
    // déclarée inférieure à 500 000 FCFA.
    const viaDeclaredValue = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.documents,
      declaredValueXaf: 1_000_001,
    });
    expect(viaDeclaredValue.baseFee).toBeGreaterThan(5_000);

    const viaSpecialCategory = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.special,
      declaredValueXaf: 200_000,
    });
    expect(viaSpecialCategory.baseFee).toBe(5_000);

    // Au-delà de 500 000 FCFA, même une catégorie C5 dépasse le plancher.
    const aboveFloor = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.special,
      declaredValueXaf: 600_000,
    });
    expect(aboveFloor.baseFee).toBe(6_000);
  });
});

/* -------------------------------------------------------------------------- */
/* Cas d'erreur et invariants                                                  */
/* -------------------------------------------------------------------------- */

describe('erreurs et invariants', () => {
  it('refuse la classe C5 sans valeur déclarée', () => {
    expect(() =>
      computeFee({
        rule: PRICING_RULE_V1,
        category: { id: 'special', defaultClass: 'C5', maxValueXaf: null },
      }),
    ).toThrow(PricingError);
  });

  it('refuse une grille qui produirait une commission négative', () => {
    const broken = {
      ...PRICING_RULE_V1,
      rewards: { ...PRICING_RULE_V1.rewards, C1: 5_000 },
    };
    expect(() => computeFee({ rule: broken, category: CATEGORIES.documents })).toThrowError(
      /NEGATIVE_COMMISSION/,
    );
  });

  it('refuse une récompense nulle', () => {
    const broken = {
      ...PRICING_RULE_V1,
      rewards: { ...PRICING_RULE_V1.rewards, C1: 0 },
    };
    expect(() => computeFee({ rule: broken, category: CATEGORIES.documents })).toThrowError(
      /NON_POSITIVE_REWARD/,
    );
  });

  it('produit un détail dont les lignes somment au total', () => {
    const r = computeFee({
      rule: PRICING_RULE_V1,
      category: CATEGORIES.phone,
      options: ['URGENT', 'DELIVERY'],
      communityBonusXaf: 2_000,
    });
    // La ligne REWARD est informative : elle est déjà incluse dans la base.
    const facturable = r.lines
      .filter((l) => l.code !== 'REWARD')
      .reduce((sum, l) => sum + l.amount, 0);
    expect(facturable).toBe(r.totalAmount);
  });

  it('fige la version de la grille utilisée', () => {
    const r = computeFee({ rule: PRICING_RULE_V1, category: CATEGORIES.documents });
    expect(r.ruleId).toBe('td-v1');
    expect(r.ruleVersion).toBe(1);
    expect(r.currency).toBe('XAF');
  });
});

/* -------------------------------------------------------------------------- */
/* Arrondis                                                                    */
/* -------------------------------------------------------------------------- */

describe('arrondis', () => {
  it('round100 arrondit au multiple de 100', () => {
    expect(round100(14_830)).toBe(14_800);
    expect(round100(14_850)).toBe(14_900);
    expect(round100(1_500)).toBe(1_500);
  });

  it('round50 arrondit au multiple de 50', () => {
    expect(round50(150)).toBe(150);
    expect(round50(175)).toBe(200);
    expect(round50(7_524)).toBe(7_500);
  });

  it('extrait la TVA incluse dans un montant hors taxes', () => {
    expect(extractVat(800, 0.18)).toBe(122);
    expect(extractVat(200, 0.18)).toBe(31);
    expect(extractVat(0, 0.18)).toBe(0);
    expect(extractVat(800, 0)).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Formatage                                                                   */
/* -------------------------------------------------------------------------- */

describe('formatage monétaire', () => {
  it('sépare les milliers et suffixe la devise', () => {
    expect(formatMoney(1_200)).toBe('1\u202F200\u202FFCFA');
    expect(formatMoney(300)).toBe('300\u202FFCFA');
    expect(formatMoney(25_000)).toBe('25\u202F000\u202FFCFA');
  });

  it('parse une saisie utilisateur tolérante', () => {
    expect(parseAmount('1 200')).toBe(1_200);
    expect(parseAmount('1 500 000')).toBe(1_500_000);
    expect(parseAmount('704 000')).toBe(704_000);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
  });
});
