import { cn } from '../lib/cn';

export interface SkeletonProps {
  /** `text` = ligne de texte, `circle` = pastille, `rect` = bloc (image, carte). */
  variant?: 'text' | 'circle' | 'rect';
  className?: string;
}

/**
 * Ossature de chargement.
 *
 * ⚠️ `motion-reduce:animate-none` : la pulsation est désactivée pour les utilisateurs
 * qui ont demandé la réduction des animations. Le bloc reste visible, simplement immobile.
 *
 * Une ossature doit reproduire la forme du contenu attendu, jamais un simple rectangle
 * générique : c'est ce qui évite le saut de mise en page à l'arrivée des données.
 */
export function Skeleton({ variant = 'text', className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-pulse bg-ink-100 motion-reduce:animate-none',
        variant === 'text' && 'h-4 rounded-sm',
        variant === 'circle' && 'h-12 w-12 rounded-full',
        variant === 'rect' && 'rounded-xl',
        className,
      )}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/** Bloc de plusieurs lignes de texte, la dernière étant plus courte. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full'}
        />
      ))}
    </span>
  );
}
