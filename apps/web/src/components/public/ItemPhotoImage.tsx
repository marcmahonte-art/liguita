import { cn } from '@liguita/ui';

import {
  SENSITIVE_PHOTO_CLASSES,
  SENSITIVE_PHOTO_LABEL,
  VISIBLE_PHOTO_CLASSES,
} from '../../lib/photo-privacy';

export interface ItemPhotoImageProps {
  src: string;
  alt: string;
  /** Vrai si la photo porte un document à ne pas publier en clair. */
  isSensitive: boolean;
  /** Classes de l'image : taille et cadrage sont laissés à l'appelant. */
  className?: string;
}

/**
 * Image de photo d'objet, pour les surfaces publiques.
 *
 * ⚠️ Un seul endroit applique le floutage. Les vignettes de `/objets-perdus`,
 * `/objets-trouves` et la fiche `/objets-perdus/[id]` passent toutes par ici : c'est
 * ce qui garantit qu'un document sensible n'est pas net sur une page et flouté sur
 * l'autre.
 *
 * Le badge est rendu à côté de l'image et positionné en absolu : l'appelant doit
 * fournir un parent `relative`, ce que font déjà les trois vignettes.
 */
export function ItemPhotoImage({ src, alt, isSensitive, className }: ItemPhotoImageProps) {
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={cn(
          'h-full w-full object-cover',
          isSensitive ? SENSITIVE_PHOTO_CLASSES : VISIBLE_PHOTO_CLASSES,
          className,
        )}
      />
      {isSensitive ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink-950/70 px-3 py-2 text-center text-2xs font-bold uppercase tracking-wide text-white">
          {SENSITIVE_PHOTO_LABEL}
        </span>
      ) : null}
    </>
  );
}
