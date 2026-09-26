import { cn } from '../lib/cn';
import { initialsOf } from '../lib/initials';
import { AvatarImage } from './AvatarImage';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-12 w-12 text-body',
  lg: 'h-16 w-16 text-h3',
};

/**
 * Fonds disponibles. Le choix est **déterministe** : le même nom produit toujours la même
 * pastille, sinon un utilisateur verrait sa couleur changer d'un écran à l'autre.
 */
const BACKGROUNDS = [
  'bg-brand-500',
  'bg-ink-900',
  'bg-success-700',
  'bg-info-700',
  'bg-warning-700',
] as const;

/** Somme des codes de caractères — stable, sans dépendance à la locale. */
function hash(value: string): number {
  let total = 0;
  for (const char of value) total += char.codePointAt(0) ?? 0;
  return total;
}

export interface AvatarProps {
  name: string;
  /**
   * Photo de profil — typiquement celle fournie par Google.
   *
   * Pas de photo : les initiales du nom sont dessinées. Photo illisible : même repli.
   * Voir `<AvatarImage />`.
   */
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * Avatar.
 *
 * ⚠️ Ce composant est rendu au serveur : `<Avatar />` n'a pas de `'use client'`, et
 * seul son enfant `<AvatarImage />` en a un. Il reste donc utilisable depuis une page
 * ou un composant serveur.
 *
 * ⚠️ Accessibilité : le nom complet est toujours exposé (`title` + texte alternatif),
 * jamais remplacé par la seule pastille colorée.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const background = BACKGROUNDS[hash(name) % BACKGROUNDS.length] ?? BACKGROUNDS[0];

  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'font-display font-bold text-white select-none',
        SIZE_CLASSES[size],
        background,
        className,
      )}
    >
      {src ? (
        <AvatarImage name={name} src={src} />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
