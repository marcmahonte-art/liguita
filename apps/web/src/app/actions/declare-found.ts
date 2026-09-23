'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { runMatchingForFound } from '../../lib/matching/run';

export interface DeclareFoundResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Server Action : enregistre une déclaration « j'ai trouvé ».
 *
 * Vérifie la session active, valide les champs obligatoires, puis insère dans
 * `found_items` avec `status = 'FOUND'`.
 */
export async function declareFoundItem(formData: FormData): Promise<DeclareFoundResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vous devez être connecté pour déclarer un objet trouvé.' };
  }

  const categoryCode = String(formData.get('categoryCode') ?? '').trim();
  const itemTypeCode = String(formData.get('itemTypeCode') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const citySlug = String(formData.get('citySlug') ?? '').trim();
  const neighborhoodSlug = String(formData.get('neighborhoodSlug') ?? '').trim();
  const placeLabel = String(formData.get('placeLabel') ?? '').trim();
  const foundAt = String(formData.get('foundAt') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const color = String(formData.get('color') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!categoryCode || !itemTypeCode || !title || !citySlug || !placeLabel || !foundAt) {
    return {
      success: false,
      error: 'Catégorie, type, titre, ville, lieu et date sont obligatoires.',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}/.test(foundAt)) {
    return { success: false, error: 'La date de découverte est invalide.' };
  }

  const { data, error } = await supabase
    .from('found_items')
    .insert({
      finder_id: user.id,
      category_code: categoryCode,
      item_type_code: itemTypeCode,
      title,
      description: description || null,
      brand: brand || null,
      color: color || null,
      city_slug: citySlug,
      neighborhood_slug: neighborhoodSlug || null,
      place_label: placeLabel,
      found_at: foundAt,
      status: 'FOUND',
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "L'enregistrement a échoué. Réessayez.",
    };
  }

  // Matching synchrone (§6.5) — service_role pour lire les pertes des autres
  // utilisateurs. On ne bloque pas la réponse si le pré-filtrage échoue :
  // le worker match-sweep rattrapera.
  try {
    const service = tryCreateServiceClient();
    if (service) await runMatchingForFound(service, data.id);
  } catch {
    // best-effort
  }

  revalidatePath('/declarer/trouve');
  revalidatePath('/app/correspondances');
  return { success: true, id: data.id };
}
