'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { buttonClasses, type ButtonSize, type ButtonVariant } from '../lib/button-classes';

/**
 * Bouton Liguita.
 *
 * ⚠️ `buttonClasses` n'est PAS défini ici, mais dans `../lib/button-classes`. Ce fichier
 * porte `'use client'`, et tout ce qu'un module client exporte devient une référence
 * client : une fonction exportée d'ici ne pourrait plus être appelée depuis un composant
 * serveur. La fabrique de classes est donc isolée dans un module neutre.
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

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Affiche un indicateur de chargement. Le libellé est conservé : le bouton ne rétrécit pas. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

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
