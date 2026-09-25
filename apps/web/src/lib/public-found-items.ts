import 'server-only';

import { createServiceClient } from './supabase/service';
import { toPublicItem, type PublicItem } from './search';

export interface PublicFoundItemCard {
  item: PublicItem;
  photoUrl: string | null;
}

const PHOTO_PATH_PATTERN = /^FOUND\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

export async function fetchPublicFoundItems(limit = 24): Promise<PublicFoundItemCard[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('found_items')
    .select('id, category_code, item_type_code, title, brand, color, city_slug, neighborhood_slug, place_label, found_at, status, created_at, description')
    .eq('is_public', true)
    .in('status', ['FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED'])
    .order('found_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new Error(error.message);

  return Promise.all(
    (data ?? []).map(async (value) => {
      const row = value as Record<string, unknown>;
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
        description_preview:
          typeof row.description === 'string' ? row.description.slice(0, 120) : null,
        photo_count: 0,
      });
      const { data: photoRows, error: photoError } = await service
        .from('item_photos')
        .select('url')
        .eq('item_kind', 'FOUND')
        .eq('item_id', item.id)
        .order('sort_order', { ascending: true })
        .limit(1);
      if (photoError || !photoRows?.[0]) return { item, photoUrl: null };
      const photoPath = photoRows[0].url;
      if (!PHOTO_PATH_PATTERN.test(photoPath) || !photoPath.startsWith(`FOUND/${item.id}/`)) {
        return { item, photoUrl: null };
      }
      const signed = await service.storage.from('item-photos').createSignedUrl(photoPath, 60);
      return { item, photoUrl: signed.data?.signedUrl ?? null };
    }),
  );
}
