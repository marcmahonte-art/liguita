'use client';

import { useCallback, useEffect, useState } from 'react';

import { formatMoney } from '@liguita/core/pricing';
import { Alert, Card, Skeleton } from '@liguita/ui';

import { getWallet, type WalletSummary } from '../../actions/wallet';
import { formatShortDate } from '../../../lib/format';

const EMPTY_WALLET: WalletSummary = {
  availableBalance: 0,
  pendingBalance: 0,
  currency: 'XAF',
  entries: [],
  withdrawals: [],
};

const SOURCE_LABELS: Record<string, string> = {
  REWARD: 'Recompense objet trouvé',
  REWARD_RELEASE: 'Recompense disponible',
  WITHDRAWAL: 'Retrait Airtel Money',
};

export default function TransactionsPage() {
  const [wallet, setWallet] = useState<WalletSummary>(EMPTY_WALLET);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getWallet();
    if (result.error) setError(result.error);
    else {
      setError(null);
      setWallet(result.wallet);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <Skeleton variant="rect" className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Mes transactions
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Historique de vos récompenses et opérations Airtel Money.
        </p>
      </div>
      {error ? <Alert tone="danger" title="Transactions">{error}</Alert> : null}
      <Card>
        {wallet.entries.length === 0 ? (
          <p className="text-body-sm text-ink-600">Aucune transaction pour le moment.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {wallet.entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-900">{SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}</p>
                  <p className="text-caption text-ink-500">{formatShortDate(entry.createdAt)}</p>
                </div>
                <p className={entry.direction === 'CREDIT' ? 'font-bold text-success-700' : 'font-bold text-danger-700'}>
                  {entry.direction === 'CREDIT' ? '+' : '−'} {formatMoney(entry.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
