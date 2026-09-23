'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { runMatchingForLost } from '../../lib/matching/run';

export interface DeclareLostResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Server Action : enregistre une déclaration « j'ai perdu ».
 *
 * Vérifie la session active, valide les champs obligatoires, puis insère dans
 * `lost_items` avec `status = 'DECLARED'`. La RLS pose la contrainte `user_id`
 * côté base ; on la double ici pour un message d'erreur lisible.
 */
export async function declareLostItem(formData: FormData): Promise<DeclareLostResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vous devez être connecté pour déclarer un objet perdu.' };
  }

  const categoryCode = String(formData.get('categoryCode') ?? '').trim();
  const itemTypeCode = String(formData.get('itemTypeCode') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const citySlug = String(formData.get('citySlug') ?? '').trim();
  const neighborhoodSlug = String(formData.get('neighborhoodSlug') ?? '').trim();
  const placeLabel = String(formData.get('placeLabel') ?? '').trim();
  const occurredAt = String(formData.get('occurredAt') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const color = String(formData.get('color') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const declaredValueRaw = String(formData.get('declaredValueXaf') ?? '').trim();

  if (!categoryCode || !itemTypeCode || !title || !citySlug || !placeLabel || !occurredAt) {
    return {
      success: false,
      error: 'Catégorie, type, titre, ville, lieu et date sont obligatoires.',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}/.test(occurredAt)) {
    return { success: false, error: 'La date de perte est invalide.' };
  }

  const declaredValueXaf = declaredValueRaw ? Number.parseInt(declaredValueRaw, 10) : null;

  const { data, error } = await supabase
    .from('lost_items')
    .insert({
      user_id: user.id,
      category_code: categoryCode,
      item_type_code: itemTypeCode,
      title,
      description: description || null,
      brand: brand || null,
      color: color || null,
      city_slug: citySlug,
      neighborhood_slug: neighborhoodSlug || null,
      place_label: placeLabel,
      occurred_at: occurredAt,
      status: 'DECLARED',
      declared_value_xaf:
        declaredValueXaf !== null && Number.isFinite(declaredValueXaf)
          ? declaredValueXaf
          : null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "L'enregistrement a échoué. Réessayez.",
    };
  }

  try {
    const service = tryCreateServiceClient();
    if (service) await runMatchingForLost(service, data.id);
  } catch {
    // best-effort
  }

  revalidatePath('/declarer/perdu');
  revalidatePath('/app/correspondances');
  return { success: true, id: data.id };
}
