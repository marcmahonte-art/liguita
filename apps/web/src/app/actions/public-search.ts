'use server';

/**
 * Recherche publique unifiée : objets perdus ET trouvés, dans un seul appel.
 *
 * Remplace l'appariement de deux requêtes paginées séparément
 * (`searchPublicFoundItems` + `searchPublicLostItems`). Deux listesindependantes
 * concaténées ne produisent pas un tri global : elles affichaient tous les objets
 * trouvés, puis tous les objets perdus, sans ordre entre les deux. La fusion se fait
 * désormais en base (`search_public_items`), qui renvoie un curseur unique.
 *
 * Chaque type d'objet garde exactement la forme que sa carte attend — `PublicItem`
 * pour un objet trouvé, `PublicLostSearchItem` pour un objet perdu — afin que les
 * composants n'aient pas à changer.
 */

import { fetchBlurredItemIds, type ItemPhotoReader } from '../../lib/item-photos';
import { toPublicItem, type PublicItem } from '../../lib/search';
import { createServiceClient } from '../../lib/supabase/service';
import type { PublicFoundSearchItem } from './public-found-items';
import type { PublicLostSearchItem } from './public-lost-items';

export type PublicSearchItem = PublicFoundSearchItem | PublicLostSearchItem;

export interface SearchPublicItemsInput {
  query?: string;
  /** `'all'` ne filtre rien ; `'found'` et `'lost'` restreignent à un type. */
  kind?: 'all' | 'found' | 'lost';
  categoryCode?: string;
  neighborhoodSlug?: string;
  cursorEventAt?: string | null;
  cursorKind?: string | null;
  cursorId?: string | null;
  limit?: number;
}

export interface SearchPublicItemsResult {
  items: PublicSearchItem[];
  nextCursorEventAt: string | null;
  nextCursorKind: string | null;
  nextCursorId: string | null;
  hasMore: boolean;
  error?: string;
}

/** Le préfixe du chemin de photo doit correspondre au type d'objet, sinon c'est une autre photo. */
const PHOTO_PATH_PATTERN = /^(FOUND|LOST)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

const KIND_TO_RPC: Record<NonNullable<SearchPublicItemsInput['kind']>, 'FOUND' | 'LOST' | null> = {
  all: null,
  found: 'FOUND',
  lost: 'LOST',
};

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export async function searchPublicItems(
  input: SearchPublicItemsInput,
): Promise<SearchPublicItemsResult> {
  const empty: SearchPublicItemsResult = {
    items: [],
    nextCursorEventAt: null,
    nextCursorKind: null,
    nextCursorId: null,
    hasMore: false,
  };

  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('search_public_items', {
      p_query: input.query?.trim() || null,
      p_kind: KIND_TO_RPC[input.kind ?? 'all'],
      p_category_code: input.categoryCode || null,
      p_neighborhood_slug: input.neighborhoodSlug || null,
      p_cursor_event_at: input.cursorEventAt || null,
      p_cursor_kind: input.cursorKind || null,
      p_cursor_id: input.cursorId || null,
      p_limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
    });
    if (error) throw new Error(error.message);

    const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;

    /* Les photos d'objets perdus peuvent être floutées ; une seule requête pour toute
       la page, voir `fetchBlurredItemIds`. Les objets trouvés ne sont pas concernés. */
    const blurredLostIds = await fetchBlurredItemIds(
      service as unknown as ItemPhotoReader,
      rows
        .filter((row) => text(row, 'kind') === 'LOST')
        .map((row) => text(row, 'id'))
        .filter((id): id is string => id !== null),
      'LOST',
    );

    const items = await Promise.all(
      rows.map(async (row): Promise<PublicSearchItem | null> => {
        const kind = text(row, 'kind');
        const id = text(row, 'id');
        const eventAt = text(row, 'event_at');
        const photoPath = text(row, 'photo_path');

        if ((kind !== 'FOUND' && kind !== 'LOST') || !id || !eventAt) return null;

        const prefix = `${kind}/${id}/`;
        let photoUrl: string | null = null;
        if (photoPath && PHOTO_PATH_PATTERN.test(photoPath) && photoPath.startsWith(prefix)) {
          const signed = await service.storage.from('item-photos').createSignedUrl(photoPath, 60);
          photoUrl = signed.data?.signedUrl ?? null;
        }

        if (kind === 'LOST') {
          const categoryCode = text(row, 'category_code');
          const itemTypeCode = text(row, 'item_type_code');
          const title = text(row, 'title');
          const citySlug = text(row, 'city_slug');
          const status = text(row, 'status');
          const createdAt = text(row, 'created_at');
          if (!categoryCode || !itemTypeCode || !title || !citySlug || !status || !createdAt) {
            return null;
          }
          return {
            kind: 'lost' as const,
            id,
            category_code: categoryCode,
            item_type_code: itemTypeCode,
            title,
            brand: text(row, 'brand'),
            color: text(row, 'color'),
            city_slug: citySlug,
            neighborhood_slug: text(row, 'neighborhood_slug'),
            occurred_at: eventAt,
            status,
            created_at: createdAt,
            photoUrl,
            photoIsBlurred: blurredLostIds.has(id),
          } satisfies PublicLostSearchItem;
        }

        // Un objet trouvé passe par la projection publique unique : c'est elle qui
        // refuse les colonnes interdites par la loi n° 007/PR/2015.
        let item: PublicItem;
        try {
          item = toPublicItem({
            id,
            category_code: text(row, 'category_code'),
            item_type_code: text(row, 'item_type_code'),
            title: text(row, 'title'),
            brand: text(row, 'brand'),
            color: text(row, 'color'),
            city_slug: text(row, 'city_slug'),
            neighborhood_slug: text(row, 'neighborhood_slug'),
            place_label: text(row, 'place_label'),
            found_at: eventAt,
            status: text(row, 'status'),
            created_at: text(row, 'created_at'),
            description_preview: null,
            photo_count: 0,
          });
        } catch {
          // Une ligne incomplète ne doit pas faire échouer toute la recherche.
          return null;
        }
        return { kind: 'found' as const, item, photoUrl } satisfies PublicFoundSearchItem;
      }),
    );

    const last = rows[rows.length - 1];
    const nextCursorEventAt = text(last ?? {}, 'next_cursor_event_at');
    const nextCursorKind = text(last ?? {}, 'next_cursor_kind');
    const nextCursorId = text(last ?? {}, 'next_cursor_id');

    return {
      items: items.filter((item): item is PublicSearchItem => item !== null),
      nextCursorEventAt,
      nextCursorKind,
      nextCursorId,
      hasMore: Boolean(nextCursorEventAt && nextCursorId),
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : 'La recherche est indisponible.',
    };
  }
}
