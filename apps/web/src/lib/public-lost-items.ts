import 'server-only';

import { createServiceClient } from './supabase/service';
import { fetchBlurredItemIds, type ItemPhotoReader } from './item-photos';

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
  /** Voir `PublicLostItemDetail.photoIsBlurred`. */
  photoIsBlurred: boolean;
}

const PHOTO_PATH_PATTERN = /^LOST\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export interface PublicLostItemDetail extends PublicLostItemCard {
  photos: string[];
  /**
   * Vrai dès qu'**une seule** photo de la fiche est marquée sensible.
   *
   * ⚠️ On ne floute pas photo par photo. Une fiche dont la deuxième image est floutée
   * et la première nette indique elle-même que la deuxième est un document : le
   * traitement sélectif en dit plus que le traitement uniforme. La fiche est donc
   * floutée en entier, ou pas du tout.
   */
  photoIsBlurred: boolean;
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
    .select('url, is_blurred')
    .eq('item_kind', 'LOST')
    .eq('item_id', id)
    .order('sort_order', { ascending: true });
  if (photoError) throw new Error(photoError.message);

  const photos: string[] = [];
  let anyBlurred = false;
  for (const row of photoRows ?? []) {
    if (row.is_blurred === true) anyBlurred = true;
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
    photoIsBlurred: anyBlurred,
    photos,
  };
}

export async function fetchPublicLostItems(limit = 24): Promise<PublicLostItemCard[]> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('search_public_lost_items', {
    p_limit: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw new Error(error.message);

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];

  /* La RPC ne renvoie que `photo_path`. Le drapeau de floutage doit être lu à part,
     et en une seule requête pour toute la page : une requête par objet porterait le
     nombre d'allers-retours à deux par vignette, sur une page qui en affiche vingt. */
  const blurredItemIds = await fetchBlurredItemIds(
    service as unknown as ItemPhotoReader,
    rows.map((row) => text(row, 'id')).filter((id): id is string => id !== null),
    'LOST',
  );

  return Promise.all(
    rows.map(async (row) => {
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
        photoIsBlurred: blurredItemIds.has(id),
      } satisfies PublicLostItemCard;
    }),
  ).then((items) => items.filter((item): item is PublicLostItemCard => item !== null));
}
