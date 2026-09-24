'use client';

import { ArrowLeft, CalendarDays, MapPin, Package } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { findCategory, findCity, findNeighborhood } from '@liguita/config';
import { Alert, Badge, buttonClasses, Card, Skeleton } from '@liguita/ui';

import { ItemPhotoGallery } from '../../../../../components/app/ItemPhotoGallery';
import { getMyOwnerItem, type OwnerItemDetail } from '../../../../actions/owner-items';
import { useAuth } from '../../../../../lib/auth/auth-context';
import { formatLongDate } from '../../../../../lib/format';

const STATUS_LABELS: Record<string, string> = {
  DECLARED: 'Déclaré',
  SEARCHING: 'Recherche en cours',
  MATCH_FOUND: 'Correspondance trouvée',
  VERIFYING: 'Vérification',
  PAID: 'Payé',
  RETURNED: 'Restitué',
  CLOSED: 'Clôturé',
  EXPIRED: 'Expiré',
  FOUND: 'Trouvé',
  IN_INVENTORY: 'En inventaire',
  MATCH_POSSIBLE: 'Correspondance possible',
  OWNER_IDENTIFIED: 'Propriétaire identifié',
  RETURN_IN_PROGRESS: 'Restitution en cours',
  ARCHIVED: 'Archivé',
};

export default function OwnerObjectDetailPage() {
  const params = useParams<{ kind: string; id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [item, setItem] = useState<OwnerItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let cancelled = false;
    setIsLoading(true);
    void getMyOwnerItem({ kind: params.kind, id: params.id }).then((result) => {
      if (cancelled) return;
      setItem(result.item);
      setError(result.error ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, params.id, params.kind, user]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton variant="rect" className="h-10 w-32" />
        <Skeleton variant="rect" className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton variant="rect" className="h-48 w-full" />
          <Skeleton variant="rect" className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-5">
        <Link href="/app/objets" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft size={16} /> Mes objets
        </Link>
        <Alert tone="danger" title="Objet indisponible">
          {error ?? 'Cet objet est introuvable.'}
        </Alert>
      </div>
    );
  }

  const category = findCategory(item.item_type_code) ?? findCategory(item.category_code);
  const city = findCity(item.city_slug);
  const neighborhood = item.neighborhood_slug
    ? findNeighborhood(item.neighborhood_slug)
    : undefined;
  const location = [item.place_label, neighborhood?.name ?? city?.name ?? item.city_slug]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-6">
      <Link href="/app/objets" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft size={16} /> Mes objets
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone={item.kind === 'LOST' ? 'lost' : 'found'} dot>
            {item.kind === 'LOST' ? 'Objet perdu' : 'Objet trouvé'}
          </Badge>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            {item.title}
          </h1>
          <p className="mt-1 text-caption text-ink-500">
            Déclaré le {formatLongDate(item.created_at)}
          </p>
        </div>
        <Badge tone="neutral">{STATUS_LABELS[item.status] ?? item.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
            <Package size={17} /> Informations
          </h2>
          <dl className="mt-4 space-y-3 text-body-sm">
            <div>
              <dt className="text-caption text-ink-500">Catégorie</dt>
              <dd className="mt-0.5">{category?.labelFr ?? item.category_code}</dd>
            </div>
            {item.brand ? (
              <div>
                <dt className="text-caption text-ink-500">Marque</dt>
                <dd className="mt-0.5">{item.brand}</dd>
              </div>
            ) : null}
            {item.color ? (
              <div>
                <dt className="text-caption text-ink-500">Couleur</dt>
                <dd className="mt-0.5">{item.color}</dd>
              </div>
            ) : null}
            {item.declared_value_xaf !== null ? (
              <div>
                <dt className="text-caption text-ink-500">Valeur déclarée</dt>
                <dd className="mt-0.5">{item.declared_value_xaf.toLocaleString('fr-FR')} XAF</dd>
              </div>
            ) : null}
          </dl>
          {item.description ? (
            <p className="mt-5 border-t border-ink-100 pt-4 text-body-sm leading-relaxed text-ink-700">
              {item.description}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
            <MapPin size={17} /> Lieu et date
          </h2>
          <div className="mt-4 space-y-3 text-body-sm">
            <div>
              <p className="text-caption text-ink-500">Lieu déclaré</p>
              <p className="mt-0.5">{location}</p>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden />
              <div>
                <p className="text-caption text-ink-500">
                  {item.kind === 'LOST' ? 'Date de perte' : 'Date de trouvaille'}
                </p>
                <p className="mt-0.5">{formatLongDate(item.event_at)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ItemPhotoGallery itemId={item.id} itemKind={item.kind} />
    </div>
  );
}
