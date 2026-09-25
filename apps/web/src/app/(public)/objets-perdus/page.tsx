import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

import { LostItemCard } from '../../../components/public/LostItemCard';
import { fetchPublicLostItems, type PublicLostItemCard } from '../../../lib/public-lost-items';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Objets perdus au Tchad — Liguita',
  description:
    'Consultez les objets perdus déclarés sur Liguita à N’Djamena et au Tchad. Photos et informations utiles, sans données personnelles.',
  alternates: { canonical: '/objets-perdus' },
};

export default async function LostItemsPage() {
  let items: PublicLostItemCard[] = [];
  let error: string | null = null;
  try {
    items = await fetchPublicLostItems();
  } catch {
    error = 'Les objets perdus ne sont pas disponibles pour le moment.';
  }

  return (
    <div className="bg-ink-50/40 min-h-screen py-10 sm:py-14">
      <div className="container-liguita">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Objets perdus au Tchad
          </h1>
          <p className="mt-2 text-body text-ink-600">
            Les dernières déclarations de pertes, avec leurs photos. Si vous avez retrouvé l’un
            de ces objets, aidez son propriétaire à le récupérer.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm font-semibold text-ink-700">
            {items.length} objet{items.length <= 1 ? '' : 's'} à retrouver
          </p>
          <Link href="/declarer/perdu" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
            Déclarer une perte
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-2xl border border-danger-200 bg-danger-50 p-5 text-body text-danger-800">
            {error}
          </p>
        ) : items.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <LostItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <h2 className="font-display text-xl font-bold text-ink-900">
              Aucun objet perdu publié pour le moment
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-600">
              Revenez plus tard, ou publiez une déclaration pour aider la communauté.
            </p>
            <Link
              href="/declarer/perdu"
              className={`${buttonClasses({ variant: 'primary' })} mt-6`}
            >
              Déclarer un objet perdu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
