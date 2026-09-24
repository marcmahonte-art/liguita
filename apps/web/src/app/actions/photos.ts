'use server';

import { createClient } from '../../lib/supabase/server';

const BUCKET = 'item-photos';
const SIGNED_URL_TTL_SECONDS = 60;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_PATH_PATTERN =
  /^(LOST|FOUND)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/]+$/i;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface UploadItemPhotoResult {
  success: boolean;
  id?: string;
  signedUrl?: string;
  error?: string;
}

export interface ItemPhoto {
  id: string;
  itemId: string;
  itemKind: string;
  signedUrl: string;
  sortOrder: number;
  createdAt: string;
}

export interface ListItemPhotosResult {
  success: boolean;
  photos?: ItemPhoto[];
  error?: string;
}

export interface DeleteItemPhotoResult {
  success: boolean;
  error?: string;
}

function readText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateItemKind(itemKind: string): itemKind is 'LOST' | 'FOUND' {
  return itemKind === 'LOST' || itemKind === 'FOUND';
}

function validateItemId(itemId: string): boolean {
  return UUID_PATTERN.test(itemId);
}

function getPhotoFile(formData: FormData): File | null {
  const value = formData.get('photo');
  return value instanceof File ? value : null;
}

async function verifyItemOwnership(
  supabase: SupabaseClient,
  itemKind: 'LOST' | 'FOUND',
  itemId: string,
  userId: string,
): Promise<boolean> {
  if (itemKind === 'LOST') {
    const { data, error } = await supabase
      .from('lost_items')
      .select('id')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle();
    return !error && Boolean(data);
  }

  const { data, error } = await supabase
    .from('found_items')
    .select('id')
    .eq('id', itemId)
    .eq('finder_id', userId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function uploadItemPhoto(formData: FormData): Promise<UploadItemPhotoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vous devez être connecté pour envoyer une photo.' };
  }

  const itemKind = readText(formData.get('itemKind'));
  const itemId = readText(formData.get('itemId'));
  const file = getPhotoFile(formData);

  if (!validateItemKind(itemKind)) {
    return { success: false, error: 'Le type d’objet est invalide.' };
  }

  if (!validateItemId(itemId)) {
    return { success: false, error: 'L’identifiant de l’objet est invalide.' };
  }

  if (!file) {
    return { success: false, error: 'La photo est obligatoire.' };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { success: false, error: 'Format de photo non autorisé.' };
  }

  if (file.size <= 0 || file.size > MAX_PHOTO_SIZE_BYTES) {
    return { success: false, error: 'La photo doit peser au maximum 5 Mo.' };
  }

  if (!(await verifyItemOwnership(supabase, itemKind, itemId, user.id))) {
    return { success: false, error: 'Vous ne pouvez pas modifier cet objet.' };
  }

  const { data: lastPhoto, error: lastPhotoError } = await supabase
    .from('item_photos')
    .select('sort_order')
    .eq('item_id', itemId)
    .eq('item_kind', itemKind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastPhotoError) {
    return { success: false, error: lastPhotoError.message };
  }
  const sortOrder = Number(lastPhoto?.sort_order ?? -1) + 1;
  if (sortOrder >= 4) {
    return { success: false, error: 'Quatre photos maximum par objet.' };
  }

  const extensionByMimeType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  const path = `${itemKind}/${itemId}/${crypto.randomUUID()}.${extensionByMimeType[file.type]}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: photo, error: insertError } = await supabase
    .from('item_photos')
    .insert({
       item_id: itemId,
       item_kind: itemKind,
       url: path,
       sort_order: sortOrder,
    })
    .select('id')
    .single();

  if (insertError || !photo) {
    await supabase.storage.from(BUCKET).remove([path]);
    return {
      success: false,
      error: insertError?.message ?? 'La photo n’a pas pu être enregistrée.',
    };
  }

  const { data: signed, error: signedUrlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signedUrlError || !signed?.signedUrl) {
    await supabase.from('item_photos').delete().eq('id', photo.id);
    await supabase.storage.from(BUCKET).remove([path]);
    return {
      success: false,
      error: signedUrlError?.message ?? 'La photo n’a pas pu être consultable.',
    };
  }

  return { success: true, id: photo.id, signedUrl: signed.signedUrl };
}

export async function deleteItemPhoto(formData: FormData): Promise<DeleteItemPhotoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vous devez être connecté pour supprimer une photo.' };
  }

  const photoId = readText(formData.get('photoId'));
  if (!validateItemId(photoId)) {
    return { success: false, error: 'L’identifiant de la photo est invalide.' };
  }

  const { data: photo, error: photoError } = await supabase
    .from('item_photos')
    .select('id, item_id, item_kind, url')
    .eq('id', photoId)
    .maybeSingle();

  if (photoError || !photo) {
    return { success: false, error: photoError?.message ?? 'Photo introuvable.' };
  }

  if (
    !validateItemKind(photo.item_kind) ||
    !validateItemId(photo.item_id) ||
    !STORAGE_PATH_PATTERN.test(photo.url)
  ) {
    return { success: false, error: 'La photo est invalide.' };
  }

  if (!(await verifyItemOwnership(supabase, photo.item_kind, photo.item_id, user.id))) {
    return { success: false, error: 'Vous ne pouvez pas supprimer cette photo.' };
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.url]);
  if (storageError) {
    return { success: false, error: storageError.message };
  }

  const { error: metadataError } = await supabase.from('item_photos').delete().eq('id', photoId);
  if (metadataError) {
    return { success: false, error: metadataError.message };
  }

  return { success: true };
}

export type ListItemPhotosInput =
  | FormData
  | {
      itemKind: string;
      itemId: string;
    };

function getListItemPhotosInput(input: ListItemPhotosInput): { itemKind: string; itemId: string } {
  if (input instanceof FormData) {
    return {
      itemKind: readText(input.get('itemKind')),
      itemId: readText(input.get('itemId')),
    };
  }

  return {
    itemKind: input.itemKind.trim(),
    itemId: input.itemId.trim(),
  };
}

export async function listItemPhotos(input: ListItemPhotosInput): Promise<ListItemPhotosResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vous devez être connecté pour consulter vos photos.' };
  }

  const { itemKind, itemId } = getListItemPhotosInput(input);
  if (!validateItemKind(itemKind)) {
    return { success: false, error: 'Le type d’objet est invalide.' };
  }

  if (!validateItemId(itemId)) {
    return { success: false, error: 'L’identifiant de l’objet est invalide.' };
  }

  if (!(await verifyItemOwnership(supabase, itemKind, itemId, user.id))) {
    return { success: false, error: 'Vous ne pouvez pas consulter les photos de cet objet.' };
  }

  const { data: photos, error } = await supabase
    .from('item_photos')
    .select('id, item_id, item_kind, url, sort_order, created_at')
    .eq('item_id', itemId)
    .eq('item_kind', itemKind)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const signedPhotos = await Promise.all(
    (photos ?? []).map(async (photo): Promise<{ photo: ItemPhoto } | { error: string }> => {
      const { data, error: signedUrlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(photo.url, SIGNED_URL_TTL_SECONDS);

      if (signedUrlError || !data?.signedUrl) {
        return { error: signedUrlError?.message ?? 'Une photo n’a pas pu être consultable.' };
      }

      return {
        photo: {
          id: photo.id,
          itemId: photo.item_id,
          itemKind: photo.item_kind,
          signedUrl: data.signedUrl,
          sortOrder: photo.sort_order,
          createdAt: photo.created_at,
        },
      };
    }),
  );

  const firstError = signedPhotos.find((result): result is { error: string } => 'error' in result);
  if (firstError) {
    return { success: false, error: firstError.error };
  }

  return {
    success: true,
    photos: signedPhotos
      .filter((result): result is { photo: ItemPhoto } => 'photo' in result)
      .map((result) => result.photo),
  };
}
