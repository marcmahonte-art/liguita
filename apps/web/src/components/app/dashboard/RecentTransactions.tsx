import Link from 'next/link';

import { formatShortDate } from '../../../lib/format';
import { TONES, transactionMeta } from '../../../lib/icons';
import type { Transaction } from '../../../types';

function formatXaf(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('fr-FR').format(abs) + ' FCFA';
  return amount >= 0 ? `+ ${formatted}` : `- ${formatted}`;
}

interface RecentTransactionsProps {
  transactions: readonly Transaction[];
}

/**
 * Transactions récentes.
 *
 * ⚠️ **Deux informations distinctes, portées séparément.**
 *
 *  · L'ICÔNE et son fond disent la NATURE de l'opération : une récompense, des frais,
 *    un rechargement. Ce sont des choses très différentes qui ne doivent pas se
 *    confondre d'un coup d'œil.
 *
 *  · Le SIGNE du montant (`+` / `−`) dit le sens comptable. Il est écrit en toutes
 *    lettres et doublé d'une couleur — le vert pour un crédit, le rouge pour un débit —
 *    mais un relevé doit rester lisible en niveaux de gris ou pour un daltonien.
 */
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
            const meta = transactionMeta(tx.kind);
            const Icon = meta.icon;

            return (
              <li key={tx.id} className="flex items-center gap-3 py-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TONES[meta.tone]}`}
                  aria-hidden
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-body font-bold text-ink-950">
                    {tx.label}
                  </p>
                  <p className="text-2xs text-ink-500">{formatShortDate(tx.occurredAt)}</p>
                </div>
                <span
                  className={`shrink-0 font-display text-body font-extrabold tabular ${
                    isCredit ? 'text-success-700' : 'text-danger-700'
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
