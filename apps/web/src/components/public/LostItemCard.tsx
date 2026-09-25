import { CalendarDays, Image as ImageIcon, MapPin } from 'lucide-react';
import Link from 'next/link';

import { findCategory, findCity, findNeighborhood } from '@liguita/config';
import { Badge, buttonClasses } from '@liguita/ui';

import { formatLongDate } from '../../lib/format';
import type { PublicLostItemCard } from '../../lib/public-lost-items';
import type { PublicLostSearchItem } from '../../app/actions/public-lost-items';

const STATUS_LABELS: Record<string, string> = {
  DECLARED: 'Objet perdu',
  SEARCHING: 'Recherche en cours',
};

export function LostItemCard({ item }: { item: PublicLostItemCard | PublicLostSearchItem }) {
  const category = findCategory(item.item_type_code) ?? findCategory(item.category_code);
  const city = findCity(item.city_slug);
  const neighborhood = item.neighborhood_slug ? findNeighborhood(item.neighborhood_slug) : undefined;
  const location = [neighborhood?.name ?? city?.name ?? item.city_slug].filter(Boolean).join(' · ');

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xs transition hover:border-brand-300 hover:shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {item.photoUrl ? (
          <img
            src={item.photoUrl}
            alt={`Photo de l’objet perdu : ${item.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-400">
            <ImageIcon size={32} aria-hidden />
            <span className="text-caption">Photo à venir</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge tone="lost" dot>
            Objet perdu
          </Badge>
          <Badge tone="outline">{category?.labelFr ?? item.category_code}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-body-lg font-bold text-ink-950">{item.title}</h2>
          <span className="shrink-0 text-caption font-semibold text-ink-500">
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
        </div>
        <p className="mt-1 text-caption text-ink-600">
          {[item.brand, item.color].filter(Boolean).join(' · ') || 'Objet déclaré'}
        </p>
        <div className="mt-5 space-y-2 border-t border-ink-100 pt-3 text-caption text-ink-600">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="shrink-0 text-ink-400" aria-hidden />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="shrink-0 text-ink-400" aria-hidden />
            <span>Perdu le {formatLongDate(item.occurred_at)}</span>
          </div>
        </div>
        <Link
          href="/declarer/trouve"
          className={buttonClasses({ variant: 'primary', block: true, size: 'sm', className: 'mt-5' })}
        >
          J&apos;ai trouvé cet objet
        </Link>
      </div>
    </article>
  );
}
