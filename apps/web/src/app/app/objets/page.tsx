'use client';

import { EmptyState } from '@liguita/ui';

export default function MesObjetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Mes objets
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Vos déclarations de perte et de trouvaille.
        </p>
      </div>
      <EmptyState
        title="Liste à venir (Sprint 5)"
        description="Vos déclarations s'afficheront ici avec leur statut et leur historique."
      />
    </div>
  );
}
