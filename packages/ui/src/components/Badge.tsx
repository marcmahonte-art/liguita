import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export type BadgeTone = 'lost' | 'found' | 'pending' | 'neutral' | 'dark' | 'outline' | 'urgent';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Affiche un point coloré devant le libellé. */
  dot?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  lost: 'bg-brand-50 text-brand-700',
  found: 'bg-success-50 text-success-700',
  pending: 'bg-warning-50 text-warning-700',
  neutral: 'bg-ink-100 text-ink-700',
  dark: 'bg-ink-900 text-white',
  outline: 'bg-white text-ink-700 border border-ink-400',
  urgent: 'bg-brand-500 text-white',
};

/**
 * Badge d'état.
 *
 * ⚠️ Règle d'accessibilité : la couleur ne porte JAMAIS seule l'information.
 * Un badge « Restitué » vert et un badge « Perdu » rouge doivent rester distinguables
 * en niveaux de gris — d'où le libellé explicite et, quand c'est utile, une icône.
 */
export function Badge({ tone = 'neutral', children, dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-caption font-bold leading-none',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}

/** Badge de classe tarifaire — C1 à C5. */
export function ClassBadge({ pricingClass, className }: { pricingClass: string; className?: string }) {
  return (
    <Badge tone="outline" className={className}>
      Classe {pricingClass}
    </Badge>
  );
}
