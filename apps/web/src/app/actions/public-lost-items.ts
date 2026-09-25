'use server';

import { createServiceClient } from '../../lib/supabase/service';

export interface PublicLostSearchItem {
  kind: 'lost';
  id: string;
  category_code: string;
  item_type_code: string;
  title: string;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  occurred_at: string;
  status: string;
  created_at: string;
  photoUrl: string | null;
}

export interface SearchPublicLostItemsInput {
  query?: string;
  categoryCode?: string;
  neighborhoodSlug?: string;
  cursorOccurredAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}

export interface SearchPublicLostItemsResult {
  items: PublicLostSearchItem[];
  nextCursorOccurredAt: string | null;
  nextCursorId: string | null;
  hasMore: boolean;
  error?: string;
}

const PHOTO_PATH_PATTERN = /^LOST\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export async function searchPublicLostItems(
  input: SearchPublicLostItemsInput,
): Promise<SearchPublicLostItemsResult> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc('search_public_lost_items', {
      p_query: input.query?.trim() || null,
      p_category_code: input.categoryCode || null,
      p_neighborhood_slug: input.neighborhoodSlug || null,
      p_cursor_occurred_at: input.cursorOccurredAt || null,
      p_cursor_id: input.cursorId || null,
      p_limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
    });
    if (error) throw new Error(error.message);

    const rows = Array.isArray(data) ? data : [];
    const items = await Promise.all(
      rows.map(async (value) => {
        const row = value as Record<string, unknown>;
        const id = text(row, 'id');
        const categoryCode = text(row, 'category_code');
        const itemTypeCode = text(row, 'item_type_code');
        const title = text(row, 'title');
        const citySlug = text(row, 'city_slug');
        const occurredAt = text(row, 'occurred_at');
        const status = text(row, 'status');
        const createdAt = text(row, 'created_at');
        if (!id || !categoryCode || !itemTypeCode || !title || !citySlug || !occurredAt || !status || !createdAt) {
          return null;
        }

        const photoPath = text(row, 'photo_path');
        let photoUrl: string | null = null;
        if (photoPath && PHOTO_PATH_PATTERN.test(photoPath) && photoPath.startsWith(`LOST/${id}/`)) {
          const signed = await service.storage.from('item-photos').createSignedUrl(photoPath, 60);
          photoUrl = signed.data?.signedUrl ?? null;
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
          occurred_at: occurredAt,
          status,
          created_at: createdAt,
          photoUrl,
        } satisfies PublicLostSearchItem;
      }),
    );
    const last = rows[rows.length - 1] as Record<string, unknown> | undefined;
    const nextCursorOccurredAt = text(last ?? {}, 'next_cursor_occurred_at');
    const nextCursorId = text(last ?? {}, 'next_cursor_id');

    return {
      items: items.filter((item): item is PublicLostSearchItem => item !== null),
      nextCursorOccurredAt,
      nextCursorId,
      hasMore: Boolean(nextCursorOccurredAt && nextCursorId),
    };
  } catch (error) {
    return {
      items: [],
      nextCursorOccurredAt: null,
      nextCursorId: null,
      hasMore: false,
      error: error instanceof Error ? error.message : 'La recherche est indisponible.',
    };
  }
}
