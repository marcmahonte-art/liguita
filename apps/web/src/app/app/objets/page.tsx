'use client';

import { MapPin, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { findCategory, findCity, findNeighborhood } from '@liguita/config';
import { Badge, buttonClasses, EmptyState, Skeleton } from '@liguita/ui';

import {
  listMyOwnerItems,
  type OwnerItemListItem,
} from '../../actions/owner-items';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';
import { statusLabel } from '../../../lib/item-status';

/**
 * Libellé du statut — table partagée avec le tableau de bord.
 *
 * ⚠️ Cette page et le tableau de bord affichent le même statut : deux tables de
 * libellés significaient deux vocabulaires pour un même état, et le risque que l'un
 * des deux mots change sans l'autre.
 */
function labelFor(item: OwnerItemListItem): string {
  return statusLabel(item.status);
}

function getLocationLabel(item: OwnerItemListItem): string {
  const city = findCity(item.city_slug);
  const neighborhood = item.neighborhood_slug
    ? findNeighborhood(item.neighborhood_slug)
    : undefined;
  return [item.place_label, neighborhood?.name ?? city?.name ?? item.city_slug]
    .filter(Boolean)
    .join(' · ');
}

export default function MesObjetsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<OwnerItemListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let cancelled = false;
    setIsLoading(true);
    void listMyOwnerItems().then((result) => {
      if (cancelled) return;
      setError(result.error ?? null);
      setItems(result.items);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Mes objets
          </h1>
          <p className="mt-1 text-body text-ink-600">
            Vos déclarations de perte et de trouvaille.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/declarer/perdu"
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            <Plus size={16} /> J'ai perdu
          </Link>
          <Link
            href="/declarer/trouve"
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
          >
            <Plus size={16} /> J'ai trouvé
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Chargement">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rounded-2xl border border-ink-200 bg-white p-5">
              <Skeleton variant="rect" className="h-5 w-24" />
              <Skeleton variant="rect" className="mt-3 h-6 w-3/4" />
              <Skeleton variant="rect" className="mt-3 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-body text-danger-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`${buttonClasses({ variant: 'outline', size: 'sm' })} mt-4`}
          >
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun objet déclaré"
          description="Vos déclarations d’objets perdus et trouvés apparaîtront ici."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/declarer/perdu" className={buttonClasses({ variant: 'primary' })}>
                J'ai perdu un objet
              </Link>
              <Link href="/declarer/trouve" className={buttonClasses({ variant: 'outline' })}>
                J'ai trouvé un objet
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const category = findCategory(item.item_type_code) ?? findCategory(item.category_code);
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={`/app/objets/${item.kind}/${item.id}`}
                  className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={item.kind === 'LOST' ? 'lost' : 'found'} dot>
                      {item.kind === 'LOST' ? 'Objet perdu' : 'Objet trouvé'}
                    </Badge>
                    <Badge tone="neutral">
                      {labelFor(item)}
                    </Badge>
                  </div>
                  <h2 className="mt-4 font-display text-body-lg font-bold text-ink-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-caption text-ink-600">
                    {[item.brand, item.color, category?.labelFr].filter(Boolean).join(' · ') || 'Objet déclaré'}
                  </p>
                  <div className="mt-auto space-y-1.5 border-t border-ink-100 pt-3 text-caption text-ink-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="shrink-0 text-ink-400" aria-hidden />
                      <span>{getLocationLabel(item)}</span>
                    </div>
                    <p>Déclaré le {formatShortDate(item.created_at)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
