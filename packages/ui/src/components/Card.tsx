import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/cn';

export type CardVariant = 'flat' | 'elevated' | 'interactive';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Padding interne : `compact` (16 px) ou `normal` (24 px). */
  padding?: 'compact' | 'normal' | 'none';
}

/**
 * Carte Liguita.
 *
 * `interactive` ajoute un survol expressif (ombre + légère translation) : à réserver aux
 * cartes cliquables, sinon l'interface suggère une action qui n'existe pas.
 */
export function Card({
  variant = 'flat',
  padding = 'normal',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-200 bg-white',
        padding === 'compact' && 'p-4',
        padding === 'normal' && 'p-6',
        variant === 'elevated' && 'shadow-100',
        variant === 'interactive' &&
          'shadow-100 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-300',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  icon?: ReactNode;
  title: ReactNode;
  tag?: ReactNode;
  className?: string;
}

/** En-tête de carte : icône à gauche, étiquette à droite. */
export function CardHeader({ icon, title, tag, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
            {icon}
          </span>
        )}
        <h3 className="font-display text-h3 text-ink-900">{title}</h3>
      </div>
      {tag}
    </div>
  );
}
