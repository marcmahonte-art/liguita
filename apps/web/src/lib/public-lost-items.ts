import 'server-only';

import { createServiceClient } from './supabase/service';

export interface PublicLostItemCard {
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

const PHOTO_PATH_PATTERN = /^LOST\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export async function fetchPublicLostItems(limit = 24): Promise<PublicLostItemCard[]> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('search_public_lost_items', {
    p_limit: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw new Error(error.message);

  return Promise.all(
    (Array.isArray(data) ? data : []).map(async (value) => {
      const row = value as Record<string, unknown>;
      const id = text(row, 'id');
      const categoryCode = text(row, 'category_code');
      const itemTypeCode = text(row, 'item_type_code');
      const title = text(row, 'title');
      const citySlug = text(row, 'city_slug');
      const occurredAt = text(row, 'occurred_at');
      const status = text(row, 'status');
      const createdAt = text(row, 'created_at');
      const photoPath = text(row, 'photo_path');
      let photoUrl: string | null = null;

      if (
        id &&
        photoPath &&
        PHOTO_PATH_PATTERN.test(photoPath) &&
        photoPath.startsWith(`LOST/${id}/`)
      ) {
        const signed = await service.storage.from('item-photos').createSignedUrl(photoPath, 60);
        photoUrl = signed.data?.signedUrl ?? null;
      }

      if (!id || !categoryCode || !itemTypeCode || !title || !citySlug || !occurredAt || !status || !createdAt) {
        return null;
      }

      return {
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
      } satisfies PublicLostItemCard;
    }),
  ).then((items) => items.filter((item): item is PublicLostItemCard => item !== null));
}
