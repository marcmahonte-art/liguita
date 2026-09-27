'use client';

import { Suspense } from 'react';
import { Skeleton } from '@liguita/ui';
import { SearchContent } from '../../(public)/rechercher/page';

export default function AppSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 py-8" aria-busy="true">
          <Skeleton variant="rect" className="h-10 w-64" />
          <Skeleton variant="rect" className="h-48 w-full rounded-2xl" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
