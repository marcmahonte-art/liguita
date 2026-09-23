/**
 * Conversion d'une ligne `found_items` / RPC en forme PUBLIQUE.
 *
 * Point unique d'anonymisation côté client : toute liste ou carte affichée
 * hors d'un espace authentifié passe par `toPublicItem`. Le test
 * `__tests__/search-privacy.test.ts` verrouille les interdits de la loi
 * n° 007/PR/2015 (téléphone, nom, adresse, identifiant de trouveur…).
 *
 * La RPC `search_found_items` renvoie déjà la forme publique ; la fonction
 * reste utile comme garde-fou défensif si un appel futur branche une vue plus large.
 */

export interface PublicItem {
  readonly id: string;
  readonly category_code: string;
  readonly item_type_code: string;
  readonly title: string;
  readonly brand: string | null;
  readonly color: string | null;
  readonly city_slug: string;
  readonly neighborhood_slug: string | null;
  readonly place_label: string;
  readonly found_at: string;
  readonly status: string;
  readonly created_at: string;
  readonly photo_count: number | null;
  readonly description_preview: string | null;
  readonly next_cursor_found_at?: string | null;
  readonly next_cursor_id?: string | null;
}

/** Limite stricte du champ `description_preview` (alignée sur la vue SQL). */
export const DESCRIPTION_PREVIEW_MAX = 120;

/**
 * Champs interdits dans toute réponse réseau publique.
 * Ajouter ici une clé = la refuser dans `toPublicItem` et les tests.
 */
export const FORBIDDEN_PUBLIC_KEYS = [
  'phone',
  'phone_number',
  'user_id',
  'finder_id',
  'full_name',
  'display_name',
  'avatar_url',
  'email',
  'address',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'description',
  'search_vector',
] as const;

/** Shape brute : ce que la base *pourrait* renvoyer avant filtrage. */
export type FoundItemLike = Record<string, unknown>;

/**
 * Projette une ligne brute vers la forme publique.
 *
 * Stratégie « allow-list » : seules les colonnes anonymisées passent.
 * Un champ inconnu (futur `phone`, `gps`…) est ignoré par construction.
 */
export function toPublicItem(row: FoundItemLike): PublicItem {
  const text = (key: string): string | null => {
    const value = row[key];
    return typeof value === 'string' ? value : null;
  };

  const preview = text('description_preview');
  const foundAt = text('found_at');
  const createdAt = text('created_at');
  const id = text('id');
  const title = text('title');
  const categoryCode = text('category_code');
  const itemTypeCode = text('item_type_code');
  const citySlug = text('city_slug');
  const placeLabel = text('place_label');
  const status = text('status');

  if (!id || !title || !categoryCode || !itemTypeCode || !citySlug || !placeLabel || !foundAt || !createdAt || !status) {
    throw new Error('toPublicItem: ligne incomplète — colonnes publiques obligatoires manquantes.');
  }

  const photoCount = row.photo_count;
  const nextCursorFoundAt = row.next_cursor_found_at;
  const nextCursorId = row.next_cursor_id;

  return {
    id,
    category_code: categoryCode,
    item_type_code: itemTypeCode,
    title,
    brand: text('brand'),
    color: text('color'),
    city_slug: citySlug,
    neighborhood_slug: text('neighborhood_slug'),
    place_label: placeLabel,
    found_at: foundAt,
    status,
    created_at: createdAt,
    photo_count: typeof photoCount === 'number' ? photoCount : null,
    description_preview:
      preview === null
        ? null
        : preview.length > DESCRIPTION_PREVIEW_MAX
          ? preview.slice(0, DESCRIPTION_PREVIEW_MAX)
          : preview,
    next_cursor_found_at:
      typeof nextCursorFoundAt === 'string' ? nextCursorFoundAt : null,
    next_cursor_id: typeof nextCursorId === 'string' ? nextCursorId : null,
  };
}

/** Convertit un lot de lignes RPC/REST vers la forme publique. */
export function toPublicItems(rows: readonly FoundItemLike[]): PublicItem[] {
  return rows.map(toPublicItem);
}
