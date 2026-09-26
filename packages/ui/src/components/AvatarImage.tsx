'use client';

import { useEffect, useState } from 'react';

import { cn } from '../lib/cn';
import { initialsOf } from '../lib/initials';

/**
 * Photo de profil, avec repli sur les initiales.
 *
 * ⚠️ Ce composant est le seul fichier de l'avatar qui porte `'use client'` : c'est lui
 * seul qui a besoin d'un état. `<Avatar />` reste utilisable dans un composant serveur,
 * et `initialsOf` reste appelable partout.
 */
export interface AvatarImageProps {
  /** Nom du détenteur du compte — sert d'alternative textuelle. */
  name: string;
  src: string;
  className?: string;
}

export function AvatarImage({ name, src, className }: AvatarImageProps) {
  /* Une URL Google peut être révoquée, expirer, ou être bloquée par le réseau. On
     retient l'échec pour ne pas retenter le chargement à chaque rendu — sans quoi un
     utilisateur hors ligne voit l'image clignoter en boucle. */
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <span aria-hidden="true" className={cn('font-display font-bold text-white', className)}>
        {initialsOf(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={cn('h-full w-full object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}
