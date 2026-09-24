import Link from 'next/link';

import { formatShortDate } from '../../../lib/format';
import type { Transaction } from '../../../types';

const KIND_EMOJI: Record<string, string> = {
  FINDER_REWARD: '🎁',
  CONNECTION_FEE: '🤝',
  TOP_UP: '💳',
  PAYOUT: '📤',
  COMMUNITY_BONUS: '🌟',
};

function formatXaf(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('fr-FR').format(abs) + ' FCFA';
  return amount >= 0 ? `+ ${formatted}` : `- ${formatted}`;
}

interface RecentTransactionsProps {
  transactions: readonly Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="font-display text-body-lg font-bold text-ink-950">Transactions récentes</p>
        <Link
          href="/app/transactions"
          className="text-caption font-bold text-brand-600 hover:underline"
        >
          Voir tout →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-4 text-body text-ink-500">Aucune transaction pour le moment.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-ink-100">
          {transactions.map((tx) => {
            const isCredit = tx.amountXaf >= 0;
            return (
              <li key={tx.id} className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-lg">
                  {KIND_EMOJI[tx.kind] ?? '💰'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-body font-bold text-ink-950 truncate">
                    {tx.label}
                  </p>
                  <p className="text-2xs text-ink-400">
                    {formatShortDate(tx.occurredAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-display text-body font-extrabold ${
                    isCredit ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatXaf(tx.amountXaf)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
