import { Image as ImageIcon } from 'lucide-react';

import type { MatchPhoto } from '../../app/actions/matches';

interface MatchPhotoGalleryProps {
  photos: MatchPhoto[];
  side: 'lost' | 'found';
  canSeeCounterpart: boolean;
  isCounterpart: boolean;
}

export function MatchPhotoGallery({
  photos,
  side,
  canSeeCounterpart,
  isCounterpart,
}: MatchPhotoGalleryProps) {
  const sidePhotos = photos.filter((photo) => photo.side === side);

  return (
    <div className="mt-4 border-t border-black/5 pt-3">
      <div className="flex items-center gap-2 text-caption font-bold text-ink-800">
        <ImageIcon size={14} aria-hidden />
        Photos de l&apos;objet {side === 'lost' ? 'perdu' : 'trouvé'}
      </div>
      {sidePhotos.length > 0 ? (
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {sidePhotos.map((photo) => (
            <li key={photo.signedUrl} className="aspect-square overflow-hidden rounded-lg border border-ink-200 bg-white">
              <img src={photo.signedUrl} alt="Photo de l’objet" className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : isCounterpart && !canSeeCounterpart ? (
        <p className="mt-2 text-caption text-ink-500">
          Les photos restent masquées jusqu&apos;à la validation de la correspondance.
        </p>
      ) : (
        <p className="mt-2 text-caption text-ink-500">Aucune photo disponible.</p>
      )}
    </div>
  );
}
