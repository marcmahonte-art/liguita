/**
 * Calcul des frais de mise en relation.
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §5.3 et §5.4
 *
 * Formules
 * --------
 *   base            = C5 ? clamp(round100(valeur × 1 %), 5 000, 25 000) : frais[classe]
 *   urgence         = option ? round50(base × 50 %) : 0
 *   conciergerie    = option ? 1 000 : 0
 *   livraison       = option ? frais_pays : 0
 *   total           = base + urgence + conciergerie + livraison + bonus
 *   récompense      = C5 ? round100(base × 30 %) : récompense[classe]
 *   commission      = base + urgence + conciergerie − récompense
 *   part partenaire = livraison
 *   versement trouveur = récompense + bonus
 *
 * Le supplément d'urgence alimente la commission Liguita, jamais la récompense du trouveur :
 * celle-ci dépend uniquement de la classe de l'objet.
 */

import { resolveClass } from './classify';
import { extractVat, round100, round50 } from './round';
import {
  PricingError,
  type FeeBreakdown,
  type FeeInput,
  type FeeLine,
  type PricingOptionCode,
} from './types';

export function computeFee(input: FeeInput): FeeBreakdown {
  const { rule, category, declaredValueXaf, options = [], communityBonusXaf = 0 } = input;

  const has = (option: PricingOptionCode): boolean => options.includes(option);

  const { pricingClass, classSource } = resolveClass(category, declaredValueXaf, rule);

  // ---------- Frais de base ----------
  let baseFee: number;
  if (pricingClass === 'C5') {
    if (declaredValueXaf == null || declaredValueXaf <= 0) {
      throw new PricingError(
        'C5_REQUIRES_DECLARED_VALUE',
        'La classe C5 exige une valeur déclarée supérieure à zéro.',
      );
    }
    const raw = declaredValueXaf * rule.c5.rate;
    baseFee = Math.min(Math.max(round100(raw), rule.c5.floor), rule.c5.ceiling);
  } else {
    baseFee = rule.fees[pricingClass];
  }

  // ---------- Options ----------
  const urgentFee = has('URGENT') ? round50(baseFee * rule.urgentRate) : 0;
  const conciergerieFee = has('CONCIERGERIE') ? rule.conciergerieFee : 0;
  const deliveryFee = has('DELIVERY') ? rule.deliveryFee : 0;
  const communityBonus = Math.max(0, Math.trunc(communityBonusXaf));

  // ---------- Récompense du trouveur ----------
  const rewardAmount =
    pricingClass === 'C5' ? round100(baseFee * rule.c5.rewardRate) : rule.rewards[pricingClass];

  // ---------- Répartition ----------
  const totalAmount = baseFee + urgentFee + conciergerieFee + deliveryFee + communityBonus;
  const liguitaCommission = baseFee + urgentFee + conciergerieFee - rewardAmount;
  const deliveryPayout = deliveryFee;
  const vatAmount = rule.commissionIsHt ? extractVat(liguitaCommission, rule.vatRate) : 0;

  // ---------- Invariants ----------
  // Un échec ici est un bug bloquant, pas un cas limite : on refuse de produire un devis.
  if (liguitaCommission < 0) {
    throw new PricingError('NEGATIVE_COMMISSION', 'La commission Liguita serait négative.');
  }
  if (rewardAmount <= 0) {
    throw new PricingError('NON_POSITIVE_REWARD', 'La récompense du trouveur serait nulle.');
  }
  if (rewardAmount + communityBonus + liguitaCommission + deliveryPayout !== totalAmount) {
    throw new PricingError('BREAKDOWN_MISMATCH', 'La répartition ne boucle pas sur le total.');
  }

  const lines: FeeLine[] = [
    {
      code: 'BASE',
      labelFr: `Classe ${pricingClass} — frais de mise en relation`,
      amount: baseFee,
      payee: 'LIGUITA',
    },
  ];

  if (urgentFee > 0) {
    lines.push({
      code: 'URGENT',
      labelFr: 'Traitement urgent (+50 %)',
      amount: urgentFee,
      payee: 'LIGUITA',
    });
  }
  if (conciergerieFee > 0) {
    lines.push({
      code: 'CONCIERGERIE',
      labelFr: 'Conciergerie documents',
      amount: conciergerieFee,
      payee: 'LIGUITA',
    });
  }
  if (deliveryFee > 0) {
    lines.push({
      code: 'DELIVERY',
      labelFr: rule.deliveryIsProxy ? 'Livraison (estimation)' : 'Livraison',
      amount: deliveryFee,
      payee: 'PARTNER',
    });
  }
  if (communityBonus > 0) {
    lines.push({
      code: 'COMMUNITY',
      labelFr: 'Bonus communautaire',
      amount: communityBonus,
      payee: 'FINDER',
    });
  }
  lines.push({
    code: 'REWARD',
    labelFr: 'Dont récompense du trouveur',
    amount: rewardAmount,
    payee: 'FINDER',
  });

  return {
    pricingClass,
    classSource,
    baseFee,
    urgentFee,
    conciergerieFee,
    deliveryFee,
    communityBonus,
    totalAmount,
    rewardAmount,
    liguitaCommission,
    deliveryPayout,
    vatAmount,
    currency: rule.currency,
    ruleId: rule.id,
    ruleVersion: rule.version,
    lines,
  };
}
