'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { runMatchingForLost } from '../../lib/matching/run';
import { uploadItemPhoto } from './photos';

const MAX_PHOTOS = 4;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export interface DeclareLostResult {
  success: boolean;
  id?: string;
  error?: string;
  photoWarnings?: string[];
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
  const photos = formData.getAll('photos').filter((value): value is File => value instanceof File);

  if (!categoryCode || !itemTypeCode || !title || !citySlug || !placeLabel || !occurredAt) {
    return {
      success: false,
      error: 'Catégorie, type, titre, ville, lieu et date sont obligatoires.',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}/.test(occurredAt)) {
    return { success: false, error: 'La date de perte est invalide.' };
  }

  if (photos.length > MAX_PHOTOS) {
    return { success: false, error: 'Quatre photos maximum par objet.' };
  }

  for (const photo of photos) {
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return { success: false, error: 'Format de photo non autorisé.' };
    }
    if (photo.size <= 0 || photo.size > MAX_PHOTO_SIZE_BYTES) {
      return { success: false, error: 'Chaque photo doit peser au maximum 5 Mo.' };
    }
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

  const photoWarnings: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const photoFormData = new FormData();
    photoFormData.set('itemId', data.id);
    photoFormData.set('itemKind', 'LOST');
    photoFormData.set('photo', photo);
    try {
      const result = await uploadItemPhoto(photoFormData);
      if (!result.success) {
        photoWarnings.push(result.error ?? `La photo ${index + 1} n’a pas pu être ajoutée.`);
      }
    } catch {
      photoWarnings.push(`La photo ${index + 1} n’a pas pu être ajoutée.`);
    }
  }

  try {
    const service = tryCreateServiceClient();
    if (service) await runMatchingForLost(service, data.id);
  } catch {
    // best-effort
  }

  revalidatePath('/declarer/perdu');
  revalidatePath('/app/objets');
  revalidatePath('/app/correspondances');
  return {
    success: true,
    id: data.id,
    photoWarnings: photoWarnings.length > 0 ? photoWarnings : undefined,
  };
}
