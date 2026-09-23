import {
  type CategoryRef,
  type PricingClass,
  type PricingRule,
  type ValueBand,
} from '@liguita/core/pricing';

export interface PricingRuleRow {
  id: string;
  country_code: string;
  currency: string;
  version: number;
  fee_c1: number | string;
  fee_c2: number | string;
  fee_c3: number | string;
  fee_c4: number | string;
  fee_c5_rate: number | string;
  fee_c5_floor: number | string;
  fee_c5_ceiling: number | string;
  reward_c1: number | string;
  reward_c2: number | string;
  reward_c3: number | string;
  reward_c4: number | string;
  reward_c5_rate: number | string;
  urgent_rate: number | string;
  conciergerie_fee: number | string;
  delivery_fee: number | string;
  delivery_is_proxy: boolean;
  vat_rate: number | string;
  commission_is_ht: boolean;
  class_upgrade_thresholds: Record<string, number>;
  value_bands: Array<{ upTo: number | null; pricingClass: PricingClass }>;
}

function numberValue(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Règle tarifaire invalide.');
  return parsed;
}

export function toPricingRule(row: PricingRuleRow): PricingRule {
  const valueBands: ValueBand[] = row.value_bands.map((band) => ({
    upTo: band.upTo === null ? Number.POSITIVE_INFINITY : numberValue(band.upTo),
    pricingClass: band.pricingClass,
  }));
  const thresholds = Object.fromEntries(
    Object.entries(row.class_upgrade_thresholds).map(([key, value]) => [key, numberValue(value)]),
  ) as Partial<Record<PricingClass, number>>;

  return {
    id: row.id,
    version: row.version,
    countryCode: row.country_code,
    currency: row.currency,
    fees: {
      C1: numberValue(row.fee_c1),
      C2: numberValue(row.fee_c2),
      C3: numberValue(row.fee_c3),
      C4: numberValue(row.fee_c4),
      C5: 0,
    },
    rewards: {
      C1: numberValue(row.reward_c1),
      C2: numberValue(row.reward_c2),
      C3: numberValue(row.reward_c3),
      C4: numberValue(row.reward_c4),
      C5: 0,
    },
    c5: {
      rate: numberValue(row.fee_c5_rate),
      floor: numberValue(row.fee_c5_floor),
      ceiling: numberValue(row.fee_c5_ceiling),
      rewardRate: numberValue(row.reward_c5_rate),
    },
    urgentRate: numberValue(row.urgent_rate),
    conciergerieFee: numberValue(row.conciergerie_fee),
    deliveryFee: numberValue(row.delivery_fee),
    deliveryIsProxy: row.delivery_is_proxy,
    vatRate: numberValue(row.vat_rate),
    commissionIsHt: row.commission_is_ht,
    classUpgradeThresholds: thresholds,
    valueBands,
  };
}

export function toCategoryRef(row: {
  id: string;
  default_class: PricingClass;
  max_value_xaf: number | null;
}): CategoryRef {
  return {
    id: row.id,
    defaultClass: row.default_class,
    maxValueXaf: row.max_value_xaf === null ? null : numberValue(row.max_value_xaf),
  };
}
