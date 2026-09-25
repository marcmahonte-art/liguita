import { Calendar, Camera, MapPin } from 'lucide-react';
import Link from 'next/link';

import { findCategory, findCity, findNeighborhood } from '@liguita/config';
import { Badge, buttonClasses, ClassBadge } from '@liguita/ui';

import { formatLongDate } from '../../lib/format';
import type { PublicItem } from '../../lib/search';

export interface ItemCardProps {
  item: PublicItem;
  /** Badge « correspondance probable » affiché en priorité (matching). */
  matchLabel?: string;
  photoUrl?: string | null;
  className?: string;
}

/**
 * Carte publique d'un objet trouvé — surface anonymisée uniquement.
 *
 * Ne rend jamais `finder_id`, téléphone, nom, adresse ni la description
 * complète : uniquement les champs de `public_found_items` / la RPC
 * `search_found_items` (voir `toPublicItem`).
 *
 * CTA « C'est mon objet ! » : un objet *trouvé* s'adresse au propriétaire
 * qui cherche — il déclare sa perte avec `?match={id}` pour amorcer le
 * rapprochement.
 */
export function ItemCard({ item, matchLabel, photoUrl, className }: ItemCardProps) {
  const category = findCategory(item.category_code);
  const city = findCity(item.city_slug);
  const neighborhood = item.neighborhood_slug
    ? findNeighborhood(item.neighborhood_slug)
    : undefined;
  const locationLabel = [
    item.place_label,
    neighborhood?.name ?? city?.name ?? item.city_slug,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={`flex h-full flex-col justify-between rounded-2xl border border-ink-200 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-card ${className ?? ''}`}
    >
      {photoUrl ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
          <img
            src={photoUrl}
            alt={`Photo de l’objet trouvé : ${item.title}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="found" dot>
            Objet trouvé
          </Badge>
          {category?.defaultClass ? (
            <ClassBadge pricingClass={category.defaultClass} />
          ) : null}
        </div>

        {matchLabel ? (
          <p className="mt-2">
            <Badge tone="pending">{matchLabel}</Badge>
          </p>
        ) : null}

        <h3 className="mt-3 font-display text-body-lg font-bold text-ink-950">
          {item.title}
        </h3>

        {item.description_preview ? (
          <p className="mt-1.5 line-clamp-2 text-caption text-ink-600">
            {item.description_preview}
          </p>
        ) : null}

        <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-caption text-ink-600">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="shrink-0 text-ink-400" aria-hidden />
            <span>{locationLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="shrink-0 text-ink-400" aria-hidden />
            <span>Trouvé le {formatLongDate(item.found_at)}</span>
          </div>
          {item.photo_count && item.photo_count > 0 ? (
            <div className="flex items-center gap-2">
              <Camera size={15} className="shrink-0 text-ink-400" aria-hidden />
              <span>
                {item.photo_count} photo{item.photo_count > 1 ? 's' : ''}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 border-t border-ink-100 pt-3">
        <Link
          href={`/declarer/perdu?match=${encodeURIComponent(item.id)}`}
          className={buttonClasses({ variant: 'primary', block: true, size: 'sm' })}
        >
          C&apos;est mon objet !
        </Link>
      </div>
    </article>
  );
}
