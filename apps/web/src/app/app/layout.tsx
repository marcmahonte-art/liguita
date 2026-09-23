import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppSidebar } from '../../components/app/AppSidebar';
import { AppTopBar } from '../../components/app/AppTopBar';
import { AppBottomNav } from '../../components/app/AppBottomNav';

export const metadata: Metadata = {
  title: { default: 'Mon espace', template: '%s · Liguita' },
  robots: { index: false, follow: false },
};

/**
 * Coquille de l'espace connecté `/app/*`.
 *
 * Le middleware protège déjà le préfixe ; ce layout pose la navigation
 * latérale (desktop), la barre supérieure et la barre basse (mobile).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main id="contenu" className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
      <AppBottomNav />
    </div>
  );
}

