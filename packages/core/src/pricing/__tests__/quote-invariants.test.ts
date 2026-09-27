/**
 * Invariants du devis, éprouvés sur un cas réel de bout en bout.
 *
 * Ces tests ont été écrits lors d'une simulation exécutée sur la base de
 * production : un trousseau de clés (`keys`, donc classe C2) déclaré trouvé,
 * apparié à un objet perdu existant, puis réclamé et approuvé. Le devis réel
 * produit était de 700 FCFA, dont 250 au trouveur et 450 à Liguita — les
 * valeurs vérifiées ici sont celles qui ont été observées, pas des valeurs
 * choisies pour faire passer le test.
 *
 * ⚠️ **§17 du cahier des charges.** Les 700 FCFA payés par le propriétaire et
 * les 250 FCFA reversés au trouveur sont deux opérations comptables
 * distinctes. Le montant payé ne doit JAMAIS être présenté comme intégralement
 * reversé au trouveur. Le premier test ci-dessous verrouille cette règle.
 */
import { describe, expect, it } from 'vitest';

import { computeFee } from '../compute';
import { PRICING_RULE_V1 } from '../default-rule';
import type { CategoryRef } from '../types';

/** La catégorie `keys` : effets personnels, donc classe tarifaire C2. */
const CLES: CategoryRef = {
  id: 'keys',
  defaultClass: 'C2',
  maxValueXaf: null,
} as CategoryRef;

function devis(options: readonly string[] = [], bonus = 0) {
  return computeFee({
    rule: PRICING_RULE_V1,
    category: CLES,
    declaredValueXaf: null,
    options,
    communityBonusXaf: bonus,
  } as never);
}

describe('tarification — invariants du devis (cas réel classe C2)', () => {
  it('sépare la récompense du trouveur de la commission Liguita (§17)', () => {
    const r = devis();

    expect(r.totalAmount).toBe(700);
    expect(r.rewardAmount).toBe(250);
    expect(r.liguitaCommission).toBe(450);

    // Le cœur de la §17 : le trouveur ne reçoit PAS les 700 payés.
    expect(r.rewardAmount).not.toBe(r.totalAmount);
    // Et la répartition doit boucler exactement sur le total.
    expect(r.rewardAmount + r.liguitaCommission).toBe(r.totalAmount);
  });

  it('extrait la TVA de la commission au lieu de l’ajouter au total', () => {
    const r = devis();

    // 450 × 18/118 = 68,64 -> 69. Si la TVA était ajoutée, le total
    // dépasserait 700 et le propriétaire paierait plus que le prix affiché.
    expect(r.totalAmount).toBe(700);
    expect(r.vatAmount).toBeLessThanOrEqual(r.liguitaCommission);
    expect(r.vatAmount).toBeGreaterThan(0);
  });

  it('reverse l’urgence à Liguita, sans toucher à la récompense du trouveur', () => {
    const normal = devis();
    const urgent = devis(['URGENT']);

    expect(urgent.totalAmount).toBeGreaterThan(normal.totalAmount);
    // Le supplément d'urgence ne doit pas être pris sur la part du trouveur.
    expect(urgent.rewardAmount).toBe(normal.rewardAmount);
  });

  it('reverse le bonus communautaire au trouveur, hors commission', () => {
    const sansBonus = devis();
    const avecBonus = devis([], 1000);

    // `rewardAmount` est documenté « hors bonus communautaire » : le bonus est
    // une ligne distincte (`communityBonus`). Les deux sont séparés pour que le
    // reçu puisse les présenter comme deux opérations — même exigence que §17.
    expect(avecBonus.communityBonus).toBe(1000);
    expect(avecBonus.totalAmount).toBe(sansBonus.totalAmount + 1000);
    expect(avecBonus.rewardAmount + avecBonus.communityBonus).toBe(
      sansBonus.rewardAmount + 1000,
    );
    // Le bonus ne doit pas gonfler la commission.
    expect(avecBonus.liguitaCommission).toBe(sansBonus.liguitaCommission);
  });
});
