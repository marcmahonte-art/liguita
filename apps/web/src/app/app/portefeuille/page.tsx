'use client';

import { buildWallet, MOCK_TRANSACTIONS } from '../../../lib/mock-data';
import { WalletWidget } from '../../../components/app/dashboard/WalletWidget';
import { RecentTransactions } from '../../../components/app/dashboard/RecentTransactions';

const wallet = buildWallet(MOCK_TRANSACTIONS);

export default function PortefeuillePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Mon portefeuille
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Gérez votre solde, rechargez votre compte et suivez vos transactions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <WalletWidget wallet={wallet} />
        <RecentTransactions transactions={MOCK_TRANSACTIONS} />
      </div>
    </div>
  );
}
