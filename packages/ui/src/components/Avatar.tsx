import { cn } from '../lib/cn';

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

export interface AvatarProps {
  name: string;
  /** Photo de profil. En cas d'échec de chargement, les initiales restent affichées. */
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** Somme des codes de caractères — stable, sans dépendance à la locale. */
function hash(value: string): number {
  let total = 0;
  for (const char of value) total += char.codePointAt(0) ?? 0;
  return total;
}

/**
 * Initiales : au plus deux lettres, sur les deux premiers mots du nom.
 * Un nom tchadien courant (« Mahamat Abakar Ali ») donne « MA », pas « MAA ».
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.charAt(0) ?? '';
  const second = words.length > 1 ? (words[1]?.charAt(0) ?? '') : '';
  return `${first}${second}`.toUpperCase() || '?';
}

/**
 * Avatar.
 *
 * ⚠️ Accessibilité : le nom complet est toujours exposé (`title` + texte lisible),
 * jamais remplacé par la seule pastille colorée.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = initialsOf(name);
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
