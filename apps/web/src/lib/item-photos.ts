import 'server-only';

/**
 * Lecture en lot du drapeau de floutage d'une page d'objets.
 *
 * Les RPC de recherche (`search_public_lost_items`) ne renvoient que `photo_path` : le
 * chemin de la photo, pas son statut de confidentialité. Lire `is_blurred` objet par
 * objet doublerait le nombre d'allers-retours sur une page de vingt vignettes, pour
 * une information qui tient en une requête.
 *
 * Le client est passé en paramètre pour que l'appelant réutilise celui qu'il a déjà
 * construit, et pour que cette fonction reste testable sans configuration.
 *
 * ⚠️ Le filtre porte sur `is_blurred` **et** sur `item_kind`. Sans le second, une photo
 * perdue marquerait l'objet trouvé du même identifiant — et le uuid est unique, donc la
 * coïncidence est rare, mais le code qui produit l'ensemble serait faux, et c'est
 * précisément ce genre de raccourci qui survit deux ans.
 */
interface ItemPhotoQuery {
  eq: (column: string, value: boolean | string) => ItemPhotoQuery;
  in: (
    column: string,
    values: readonly string[],
  ) => PromiseLike<{ data: Array<{ item_id: string }> | null }>;
}

export interface ItemPhotoReader {
  from: (table: 'item_photos') => { select: (columns: string) => ItemPhotoQuery };
}

/**
 * Le client passé en paramètre est le vrai client Supabase, pas un `ItemPhotoReader`.
 *
 * ⚠️ L'adaptation est faite par l'appelant (`as unknown as ItemPhotoReader`) et non
 * ici : les types du constructeur Supabase sont récursifs, et leur comparaison
 * structurelle fait exploser l'instanciation du vérificateur de types
 * (« excessively deep and possibly infinite »). Le couplage faible est assumé ici — il
 * n'est réellement utilisé qu'avec ce client, et une erreur se verrait immédiatement,
 * une requête sur une colonne inexistante renvoyant `{}` et non des identifiants.
 */
export async function fetchBlurredItemIds(
  service: ItemPhotoReader,
  itemIds: readonly string[],
  itemKind: 'LOST' | 'FOUND',
): Promise<Set<string>> {
  const ids = [...new Set(itemIds.filter((id) => typeof id === 'string' && id !== ''))];
  if (ids.length === 0) return new Set();

  const { data } = await service
    .from('item_photos')
    .select('item_id')
    .eq('is_blurred', true)
    .eq('item_kind', itemKind)
    .in('item_id', ids);

  return new Set((data ?? []).map((row) => row.item_id));
}
