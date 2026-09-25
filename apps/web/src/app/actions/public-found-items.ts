'use server';

import { createServiceClient } from '../../lib/supabase/service';
import { toPublicItem, type PublicItem } from '../../lib/search';

export interface PublicFoundSearchItem {
  kind: 'found';
  item: PublicItem;
  photoUrl: string | null;
}

export interface SearchPublicFoundItemsInput {
  query?: string;
  categoryCode?: string;
  neighborhoodSlug?: string;
  cursorFoundAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}

export interface SearchPublicFoundItemsResult {
  items: PublicFoundSearchItem[];
  nextCursorFoundAt: string | null;
  nextCursorId: string | null;
  hasMore: boolean;
  error?: string;
}

const PHOTO_PATH_PATTERN = /^FOUND\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export async function searchPublicFoundItems(
  input: SearchPublicFoundItemsInput,
): Promise<SearchPublicFoundItemsResult> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('search_public_found_items', {
      p_query: input.query?.trim() || null,
      p_category_code: input.categoryCode || null,
      p_neighborhood_slug: input.neighborhoodSlug || null,
      p_cursor_found_at: input.cursorFoundAt || null,
      p_cursor_id: input.cursorId || null,
      p_limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
    });
    if (error) throw new Error(error.message);

    const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
    const items = await Promise.all(
      rows.map(async (row) => {
        const item = toPublicItem({
          id: row.id,
          category_code: row.category_code,
          item_type_code: row.item_type_code,
          title: row.title,
          brand: row.brand,
          color: row.color,
          city_slug: row.city_slug,
          neighborhood_slug: row.neighborhood_slug,
          place_label: row.place_label,
          found_at: row.found_at,
          status: row.status,
          created_at: row.created_at,
          description_preview: null,
          photo_count: 0,
        });
        const photoPath = text(row, 'photo_path');
        let photoUrl: string | null = null;
        if (photoPath && PHOTO_PATH_PATTERN.test(photoPath) && photoPath.startsWith(`FOUND/${item.id}/`)) {
          const signed = await service.storage.from('item-photos').createSignedUrl(photoPath, 60);
          photoUrl = signed.data?.signedUrl ?? null;
        }
        return { kind: 'found' as const, item, photoUrl } satisfies PublicFoundSearchItem;
      }),
    );
    const last = rows[rows.length - 1];
    const nextCursorFoundAt = text(last ?? {}, 'next_cursor_found_at');
    const nextCursorId = text(last ?? {}, 'next_cursor_id');

    return {
      items,
      nextCursorFoundAt,
      nextCursorId,
      hasMore: Boolean(nextCursorFoundAt && nextCursorId),
    };
  } catch (error) {
    return {
      items: [],
      nextCursorFoundAt: null,
      nextCursorId: null,
      hasMore: false,
      error: error instanceof Error ? error.message : 'La recherche est indisponible.',
    };
  }
}
