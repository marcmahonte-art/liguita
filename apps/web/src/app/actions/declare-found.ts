'use server';

import { revalidatePath } from 'next/cache';

import { findCategory, validateFoundSecrets } from '@liguita/config';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { runMatchingForFound } from '../../lib/matching/run';
import { uploadItemPhoto } from './photos';

const MAX_PHOTOS = 4;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export interface DeclareFoundResult {
  success: boolean;
  id?: string;
  error?: string;
  photoWarnings?: string[];
}

/**
 * Server Action : enregistre une déclaration « j'ai trouvé ».
 *
 * Vérifie la session active, valide les champs obligatoires, **exige les
 * réponses de vérification**, puis insère dans `found_items` avec
 * `status = 'FOUND'`.
 *
 * ⚠️ Les réponses de vérification sont désormais obligatoires (voir
 * `@liguita/config` → `found-secrets.ts`). Sans elles, `found_item_secrets`
 * reste vide, le score de vérification vaut 0 et **toute** réclamation part en
 * revue manuelle : c'est le défaut constaté en production, on le ferme ici.
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
  const photos = formData.getAll('photos').filter((value): value is File => value instanceof File);

  if (!categoryCode || !itemTypeCode || !title || !citySlug || !placeLabel || !foundAt) {
    return {
      success: false,
      error: 'Catégorie, type, titre, ville, lieu et date sont obligatoires.',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}/.test(foundAt)) {
    return { success: false, error: 'La date de découverte est invalide.' };
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

  if (!findCategory(categoryCode)) {
    return { success: false, error: 'Catégorie inconnue.' };
  }

  // --- Secrets de vérification (obligatoires) -------------------------------
  // Le client envoie un JSON `{"<questionCode>": "<réponse>"}` dans le champ
  // `secrets`. On ne fait jamais confiance au bouton côté client : la garde
  // est rejouée ici.
  const secrets = parseSecrets(formData.get('secrets'));
  const validation = validateFoundSecrets(categoryCode, secrets);
  if (!validation.ok) {
    return { success: false, error: validation.error };
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

  // Les secrets sont écrits AVANT les photos : sans preuve de propriété,
  // l'objet trouvé est inexploitable, il ne doit pas rester en base.
  // On passe par le client de service pour pouvoir signaler l'échec
  // d'écriture sans laisser un objet sans preuve derrière nous.
  const service = tryCreateServiceClient();
  if (!service) {
    // Sans service client on ne peut pas garantir la preuve : on annule la
    // déclaration plutôt que de recréer le défaut « secrets vides ».
    await supabase.from('found_items').delete().eq('id', data.id);
    return {
      success: false,
      error: "L'enregistrement de vos réponses de vérification a échoué. Réessayez.",
    };
  }

  const { error: secretsError } = await service
    .from('found_item_secrets')
    .upsert(
      { found_item_id: data.id, answers: secrets },
      { onConflict: 'found_item_id' },
    );

  if (secretsError) {
    // On ne laisse jamais un objet trouvé sans réponses : cela produirait
    // exactement le blocage qu'on cherche à corriger.
    await service.from('found_items').delete().eq('id', data.id);
    return {
      success: false,
      error: `Vos réponses de vérification n'ont pas pu être enregistrées : ${secretsError.message}`,
    };
  }

  const photoWarnings: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const photoFormData = new FormData();
    photoFormData.set('itemId', data.id);
    photoFormData.set('itemKind', 'FOUND');
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

  // Matching synchrone (§6.5) — service_role pour lire les pertes des autres
  // utilisateurs. On ne bloque pas la réponse si le pré-filtrage échoue :
  // le worker match-sweep rattrapera.
  try {
    await runMatchingForFound(service, data.id);
  } catch {
    // best-effort
  }

  revalidatePath('/declarer/trouve');
  revalidatePath('/app/objets');
  revalidatePath('/app/correspondances');
  return {
    success: true,
    id: data.id,
    photoWarnings: photoWarnings.length > 0 ? photoWarnings : undefined,
  };
}

/**
 * Lit le champ `secrets` du formulaire.
 *
 * Tolérant par construction : un JSON invalide renvoie `{}`, ce qui échouera
 * ensuite à la validation avec un message compréhensible plutôt qu'une erreur
 * de parsing brute.
 */
function parseSecrets(raw: FormDataEntryValue | null): Record<string, string> {
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

