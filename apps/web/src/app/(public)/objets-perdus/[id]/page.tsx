import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, MapPin, Package } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { findCategory, findCity, findNeighborhood } from '@liguita/config';
import { Badge, buttonClasses, Card } from '@liguita/ui';

import { fetchPublicLostItem } from '../../../../lib/public-lost-items';
import { formatLongDate } from '../../../../lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Objet perdu — Liguita',
  description: 'Fiche publique d’un objet perdu déclaré sur Liguita.',
};

const STATUS_LABELS: Record<string, string> = {
  DECLARED: 'Objet perdu',
  SEARCHING: 'Recherche en cours',
};

export default async function PublicLostItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchPublicLostItem(id);
  if (!item) notFound();

  const category = findCategory(item.item_type_code) ?? findCategory(item.category_code);
  const city = findCity(item.city_slug);
  const neighborhood = item.neighborhood_slug ? findNeighborhood(item.neighborhood_slug) : undefined;
  const location = [neighborhood?.name ?? city?.name ?? item.city_slug].filter(Boolean).join(' · ');

  return (
    <div className="bg-ink-50/40 min-h-screen py-10 sm:py-14">
      <div className="container-liguita max-w-4xl">
        <Link href="/objets-perdus" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft size={16} /> Tous les objets perdus
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="lost" dot>
              Objet perdu
            </Badge>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
              {item.title}
            </h1>
            <p className="mt-2 text-body text-ink-600">
              {[item.brand, item.color].filter(Boolean).join(' · ') || 'Objet déclaré'}
            </p>
          </div>
          <Badge tone="neutral">{STATUS_LABELS[item.status] ?? item.status}</Badge>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
          {item.photos.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 bg-ink-100 sm:grid-cols-2">
              {item.photos.map((photo, index) => (
                <div key={photo} className={index === 0 ? 'aspect-[4/3] sm:col-span-2' : 'aspect-square'}>
                  <img
                    src={photo}
                    alt={`Photo ${index + 1} de l’objet perdu ${item.title}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-ink-100 text-body text-ink-500">
              Aucune photo disponible
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
              <Package size={17} /> Informations
            </h2>
            <dl className="mt-4 space-y-3 text-body-sm">
              <div>
                <dt className="text-caption text-ink-500">Catégorie</dt>
                <dd className="mt-0.5">{category?.labelFr ?? item.category_code}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-500">Date de perte</dt>
                <dd className="mt-0.5">{formatLongDate(item.occurred_at)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 font-display font-bold text-ink-950">
              <MapPin size={17} /> Localisation
            </h2>
            <div className="mt-4 space-y-3 text-body-sm">
              <div>
                <p className="text-caption text-ink-500">Ville / quartier</p>
                <p className="mt-0.5">{location}</p>
              </div>
              <div className="flex items-center gap-2 text-ink-600">
                <CalendarDays size={16} className="text-ink-400" aria-hidden />
                Déclaré le {formatLongDate(item.created_at)}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/declarer/trouve" className={buttonClasses({ variant: 'primary', size: 'lg' })}>
            J&apos;ai trouvé cet objet
          </Link>
          <Link href="/objets-perdus" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
           Voir les autres objets perdus
          </Link>
        </div>
      </div>
    </div>
  );
}
