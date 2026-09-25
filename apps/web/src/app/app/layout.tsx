import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppSidebar } from '../../components/app/AppSidebar';
import { AppTopBar } from '../../components/app/AppTopBar';
import { AppBottomNav } from '../../components/app/AppBottomNav';
import { getShellBadges } from '../actions/shell';

export const metadata: Metadata = {
  title: { default: 'Mon espace', template: '%s · Liguita' },
  robots: { index: false, follow: false },
};

/**
 * Coquille de l'espace connecté `/app/*`.
 *
 * Le middleware protège déjà le préfixe ; ce layout pose la navigation
 * latérale (desktop), la barre supérieure et la barre basse (mobile).
 *
 * Le contenu est large (1440 px) et non centré sur 1024 px : un tableau de bord qui
 * n'occupe qu'un tiers d'un écran de bureau donne l'impression d'un produit inachevé.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { unreadCount, availableBalance } = await getShellBadges();

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar unreadCount={unreadCount} availableBalance={availableBalance} />
        <main id="contenu" className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
      <AppBottomNav />
    </div>
  );
}
