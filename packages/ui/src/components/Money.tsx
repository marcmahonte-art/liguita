import { formatAmount } from '@liguita/core/money';

import { cn } from '../lib/cn';

export interface MoneyProps {
  /** Montant en unité monétaire entière (FCFA). */
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  currency?: string;
  /** Affiche la devise en plus petit, comme dans les maquettes. */
  className?: string;
  /** Affiche le signe « + » devant le montant (options, suppléments). */
  signed?: boolean;
}

const SIZE_CLASSES = {
  sm: 'text-caption font-bold',
  md: 'text-money',
  lg: 'text-money',
  xl: 'text-money-lg',
} as const;

/**
 * Affichage d'un montant.
 *
 * Toujours `tabular-nums` : sans cela, la largeur des chiffres varie et les colonnes
 * de montants dans un tableau « dansent » d'une ligne à l'autre.
 *
 * Toujours suffixé « FCFA » en clair — jamais « XAF », que le public cible ne lit pas.
 *
 * @example <Money amount={1200} size="lg" />  →  1 200 FCFA
 */
export function Money({ amount, size = 'md', currency = 'FCFA', className, signed }: MoneyProps) {
  return (
    <span
      data-money
      className={cn('font-display tabular-nums tracking-[-0.01em]', SIZE_CLASSES[size], className)}
    >
      {signed && amount > 0 ? '+' : ''}
      {formatAmount(amount)}
      {size === 'sm' ? (
        <span className="ml-1 font-bold text-ink-500">{currency}</span>
      ) : (
        <span className="ml-1.5 font-bold text-ink-500">{currency}</span>
      )}
    </span>
  );
}
