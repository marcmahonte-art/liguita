import Image from 'next/image';

import { cn } from '@liguita/ui';

/**
 * Logo Liguita.
 *
 * ⚠️ Le fichier contient le mot « Liguita » en toutes lettres : il ne doit **jamais**
 * être accompagné d'un texte « Liguita » à côté. Le nom accessible est porté par
 * l'attribut `alt`, une seule fois. Afficher les deux fait lire « Liguita Liguita » par
 * un lecteur d'écran et double visuellement la marque.
 *
 * L'image a été détourée : marges rognées et fond rendu transparent, afin qu'elle
 * s'intègre aussi bien sur blanc que sur une surface teintée. Le fichier d'origine
 * portait un fond blanc et une large réserve, ce qui produisait un rectangle visible
 * dès que le fond n'était pas blanc.
 */
export function Logo({
  className,
  priority = false,
  /** Hauteur en pixels. La largeur suit le rapport d'aspect. */
  height = 36,
}: {
  className?: string;
  priority?: boolean;
  height?: number;
}) {
  return (
    <Image
      src="/logo-liguita.png"
      alt="Liguita"
      width={88}
      height={36}
      priority={priority}
      style={{ height, width: 'auto' }}
      className={cn('select-none', className)}
    />
  );
}
