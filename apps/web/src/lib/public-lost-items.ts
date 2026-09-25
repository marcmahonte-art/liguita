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

export interface PublicLostItemDetail extends PublicLostItemCard {
  photos: string[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPublicLostItem(id: string): Promise<PublicLostItemDetail | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const service = createServiceClient();
  const { data, error } = await service
    .from('lost_items')
    .select('id, category_code, item_type_code, title, brand, color, city_slug, neighborhood_slug, occurred_at, status, created_at, is_public')
    .eq('id', id)
    .eq('is_public', true)
    .in('status', ['DECLARED', 'SEARCHING'])
    .maybeSingle();
  if (error || !data) return null;

  const { data: photoRows, error: photoError } = await service
    .from('item_photos')
    .select('url')
    .eq('item_kind', 'LOST')
    .eq('item_id', id)
    .order('sort_order', { ascending: true });
  if (photoError) throw new Error(photoError.message);

  const photos: string[] = [];
  for (const row of photoRows ?? []) {
    if (!PHOTO_PATH_PATTERN.test(row.url) || !row.url.startsWith(`LOST/${id}/`)) continue;
    const signed = await service.storage.from('item-photos').createSignedUrl(row.url, 60);
    if (signed.data?.signedUrl) photos.push(signed.data.signedUrl);
  }

  return {
    id: data.id,
    category_code: data.category_code,
    item_type_code: data.item_type_code,
    title: data.title,
    brand: data.brand,
    color: data.color,
    city_slug: data.city_slug,
    neighborhood_slug: data.neighborhood_slug,
    occurred_at: data.occurred_at,
    status: data.status,
    created_at: data.created_at,
    photoUrl: photos[0] ?? null,
    photos,
  };
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
