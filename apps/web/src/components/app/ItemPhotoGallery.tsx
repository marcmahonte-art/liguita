'use client';

import { useEffect, useState } from 'react';

import { Alert, Skeleton } from '@liguita/ui';

import { listItemPhotos, type ItemPhoto } from '../../app/actions/photos';

type ItemKind = 'LOST' | 'FOUND';

interface ItemPhotoGalleryProps {
  itemId: string;
  itemKind: ItemKind;
}

export function ItemPhotoGallery({ itemId, itemKind }: ItemPhotoGalleryProps) {
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    void listItemPhotos({ itemId, itemKind }).then((result) => {
      if (!isMounted) return;
      if (result.success) {
        setPhotos(result.photos ?? []);
        setError(null);
      } else {
        setError(result.error ?? 'Les photos n’ont pas pu être chargées.');
      }
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [itemId, itemKind]);

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-body-lg font-bold text-ink-950">Photos privées</h2>
          <p className="mt-1 text-caption text-ink-500">
            Visibles uniquement dans votre espace personnel.
          </p>
        </div>
        <span className="text-caption font-semibold text-ink-500">
          {isLoading ? 'Chargement…' : `${photos.length} photo${photos.length > 1 ? 's' : ''}`}
        </span>
      </div>
      {isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} variant="rect" className="aspect-square w-full" />
          ))}
        </div>
      ) : error ? (
        <Alert tone="danger" title="Photos indisponibles" className="mt-4">
          {error}
        </Alert>
      ) : photos.length === 0 ? (
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-body-sm text-ink-600">
          Aucune photo n’a encore été ajoutée à cet objet.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="aspect-square overflow-hidden rounded-xl border border-ink-200 bg-ink-50"
            >
              <img
                src={photo.signedUrl}
                alt={`Photo de l’objet, photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
