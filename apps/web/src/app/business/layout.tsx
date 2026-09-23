import type { ReactNode } from 'react';

import { BusinessSidebar } from '../../components/business/BusinessSidebar';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-page">
      <BusinessSidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
