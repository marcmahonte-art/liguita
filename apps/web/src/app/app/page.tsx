'use client';

import { buildWallet, MOCK_ITEMS, MOCK_NOTIFICATIONS, MOCK_STATS, MOCK_TRANSACTIONS } from '../../lib/mock-data';

import { DashboardQuickNav } from '../../components/app/dashboard/DashboardQuickNav';
import { HeroBanner } from '../../components/app/dashboard/HeroBanner';
import { LiguitaTagsBanner } from '../../components/app/dashboard/LiguitaTagsBanner';
import { NotificationsWidget } from '../../components/app/dashboard/NotificationsWidget';
import { RecentActivities } from '../../components/app/dashboard/RecentActivities';
import { RecentTransactions } from '../../components/app/dashboard/RecentTransactions';
import { StatsWidget } from '../../components/app/dashboard/StatsWidget';
import { WalletWidget } from '../../components/app/dashboard/WalletWidget';

const wallet = buildWallet(MOCK_TRANSACTIONS);

/**
 * Tableau de bord principal `/app`.
 *
 * Les données affichées viennent de `mock-data.ts` jusqu'au branchement Supabase.
 * Le composant est marqué « use client » car il consomme le contexte d'auth
 * via HeroBanner → useAuth().
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Ligne 1 — Hero + Portefeuille + Stats */}
      <div className="grid gap-6 lg:grid-cols-[1fr_260px_220px]">
        <HeroBanner />
        <WalletWidget wallet={wallet} />
        <StatsWidget stats={MOCK_STATS} />
      </div>

      {/* Ligne 2 — Activités récentes + Transactions + Notifications */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_300px]">
        <RecentActivities items={MOCK_ITEMS.slice(0, 4)} />
        <RecentTransactions transactions={MOCK_TRANSACTIONS.slice(0, 5)} />
        <div className="flex flex-col gap-6">
          <NotificationsWidget notifications={MOCK_NOTIFICATIONS.slice(0, 4)} />
          <LiguitaTagsBanner />
        </div>
      </div>

      {/* Ligne 3 — Navigation rapide */}
      <DashboardQuickNav />
    </div>
  );
}
