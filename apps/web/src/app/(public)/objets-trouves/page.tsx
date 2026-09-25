import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

import { ItemCard } from '../../../components/public/ItemCard';
import { fetchPublicFoundItems, type PublicFoundItemCard } from '../../../lib/public-found-items';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Objets trouvés au Tchad — Liguita',
  description:
    'Parcourez les derniers objets trouvés déclarés sur Liguita à N’Djamena et au Tchad. Recherche anonymisée, sans données personnelles.',
  alternates: { canonical: '/objets-trouves' },
};

const PAGE_LIMIT = 24;

async function fetchFoundItems(): Promise<PublicFoundItemCard[]> {
  try {
    return await fetchPublicFoundItems(PAGE_LIMIT);
  } catch {
    return [];
  }
}

export default async function FoundItemsPage() {
  const items = await fetchFoundItems();

  return (
    <div className="bg-ink-50/40 min-h-screen py-10 sm:py-14">
      <div className="container-liguita">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Objets trouvés au Tchad
          </h1>
          <p className="mt-2 text-body text-ink-600">
            Les dernières déclarations de trouvailles, publiées sans données personnelles.
            Si l’un de ces objets vous appartient, déclarez votre perte pour lancer le
            rapprochement.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm font-semibold text-ink-700">
            {items.length} objet{items.length <= 1 ? '' : 's'} en ligne
          </p>
          <Link href="/rechercher" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
            Lancer une recherche
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ item, photoUrl }) => (
              <ItemCard key={item.id} item={item} photoUrl={photoUrl} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <h2 className="font-display text-xl font-bold text-ink-900">
              Aucun objet trouvé publié pour le moment
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-600">
              Revenez plus tard, ou déclarez vous-même un objet que vous avez trouvé pour
              aider sa propriétaire ou son propriétaire à le retrouver.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/rechercher" className={buttonClasses({ variant: 'outline' })}>
                Rechercher un objet
              </Link>
              <Link href="/declarer/trouve" className={buttonClasses({ variant: 'primary' })}>
                Déclarer un objet trouvé
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
