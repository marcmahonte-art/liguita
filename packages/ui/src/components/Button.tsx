'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Classes de base d'un bouton Liguita.
 *
 * Exposé séparément pour permettre de styler un `next/link` comme un bouton sans
 * imbriquer un `<a>` dans un `<button>` (ce qui serait invalide et casserait le clavier) :
 *
 * @example <Link href="/rechercher" className={buttonClasses({ variant: 'primary' })}>
 */
export function buttonClasses(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  const { variant = 'primary', size = 'md', block = false, className } = options;

  return cn(
    // Base : pilule, focus visible, cible tactile respectée
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-display font-bold tracking-[-0.005em]',
    'border border-transparent rounded-full',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:cursor-not-allowed',
    // Tailles — toutes ≥ 48 px de hauteur
    size === 'sm' && 'px-3.5 py-2 text-caption min-h-[48px]',
    size === 'md' && 'px-5 py-3.5 text-body min-h-[48px]',
    size === 'lg' && 'px-6 py-4 text-body-lg min-h-[56px]',
    // Variantes
    variant === 'primary' &&
      'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-200',
    variant === 'secondary' && 'bg-ink-900 text-white hover:bg-ink-700 disabled:bg-ink-300',
    variant === 'outline' &&
      'bg-transparent text-ink-900 border-ink-400 hover:bg-ink-50 hover:border-ink-900 disabled:opacity-50',
    variant === 'ghost' && 'bg-transparent text-ink-900 px-3 hover:bg-ink-100 disabled:opacity-50',
    variant === 'danger' && 'bg-danger-500 text-white hover:bg-danger-700 disabled:opacity-50',
    variant === 'success' && 'bg-success-500 text-white hover:bg-success-700 disabled:opacity-50',
    block && 'w-full',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Affiche un indicateur de chargement. Le libellé est conservé : le bouton ne rétrécit pas. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * Bouton Liguita.
 *
 * Règle produit : sur un écran, **un seul** bouton `primary` plein.
 * Le libellé contient toujours l'action et, quand il s'agit d'un paiement, le montant
 * (« Payer 1 800 FCFA »), jamais « Payer » seul.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
