'use client';

import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { buttonClasses } from '@liguita/ui';

import {
  deleteItemPhoto,
  listItemPhotos,
  uploadItemPhoto,
  type ItemPhoto,
} from '../../app/actions/photos';

type ItemKind = 'LOST' | 'FOUND';

interface ItemPhotoUploaderProps {
  itemId: string;
  itemKind: ItemKind;
  readOnly?: boolean;
}

export function ItemPhotoUploader({ itemId, itemKind, readOnly = false }: ItemPhotoUploaderProps) {
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void listItemPhotos({ itemId, itemKind }).then((result) => {
      if (!isMounted) return;
      if (result.success) {
        setPhotos(result.photos ?? []);
      } else {
        setError(result.error ?? 'Les photos existantes n’ont pas pu être chargées.');
      }
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [itemId, itemKind]);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (photos.length + files.length > 4) {
      setError('Quatre photos maximum par objet.');
      return;
    }

    setError(null);
    setIsUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.set('itemId', itemId);
      formData.set('itemKind', itemKind);
      formData.set('photo', file);
      const result = await uploadItemPhoto(formData);
      if (!result.success || !result.id || !result.signedUrl) {
        setError(result.error ?? 'Une photo n’a pas pu être ajoutée.');
        continue;
      }
      setPhotos((current) => [
        ...current,
        {
          id: result.id!,
          itemId,
          itemKind,
          signedUrl: result.signedUrl!,
          sortOrder: current.length,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setIsUploading(false);
  }

  async function handleDelete(photoId: string) {
    const formData = new FormData();
    formData.set('photoId', photoId);
    const result = await deleteItemPhoto(formData);
    if (!result.success) {
      setError(result.error ?? 'La photo n’a pas pu être supprimée.');
      return;
    }
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  return (
    <section className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/50 p-4 text-left">
      <div className="flex items-center gap-2">
        <ImagePlus size={18} className="text-brand-700" aria-hidden />
        <h2 className="font-display text-body-lg font-bold text-ink-950">
          {readOnly ? 'Photos de l’objet' : 'Ajouter des photos'}
        </h2>
      </div>
      <p className="mt-1 text-caption text-ink-600">
        {readOnly
          ? 'Visibles uniquement par les personnes autorisées sur cet objet.'
          : 'JPEG, PNG, WebP ou AVIF · 5 Mo maximum par photo · 4 photos maximum.'}
      </p>
      {!readOnly ? (
        <label className={`mt-4 ${buttonClasses({ variant: 'outline', block: true, className: 'cursor-pointer' })}`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={handleFiles}
          disabled={isLoading || isUploading || photos.length >= 4}
          className="sr-only"
        />
        <span className="inline-flex items-center justify-center gap-2">
          {isUploading ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {isUploading ? 'Téléversement…' : 'Choisir des photos'}
        </span>
      </label>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-caption text-danger-700">{error}</p> : null}
      {photos.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="relative aspect-square overflow-hidden rounded-xl border border-ink-200 bg-white">
              <img src={photo.signedUrl} alt="Photo de l’objet" className="h-full w-full object-cover" />
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => void handleDelete(photo.id)}
                  className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-white/90 text-danger-700 shadow-sm"
                  aria-label="Supprimer la photo"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
