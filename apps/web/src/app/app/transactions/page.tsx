'use client';

import { MOCK_TRANSACTIONS } from '../../../lib/mock-data';
import { RecentTransactions } from '../../../components/app/dashboard/RecentTransactions';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Mes transactions
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Historique complet de vos paiements, récompenses et recharges.
        </p>
      </div>

      <RecentTransactions transactions={MOCK_TRANSACTIONS} />
    </div>
  );
}
