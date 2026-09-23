/**
 * Fabrique de classes de bouton — module NEUTRE (ni client, ni serveur).
 *
 * ⚠️ Pourquoi ce fichier existe séparément de `Button.tsx`.
 *
 * `Button` est un composant client : son fichier porte `'use client'`. Or tout ce
 * qu'exporte un module client devient une *référence client* — y compris une simple
 * fonction de construction de chaîne. Appeler `buttonClasses()` depuis un composant
 * serveur échoue alors au build avec :
 *
 *     Attempted to call buttonClasses() from the server but buttonClasses is on the client.
 *
 * Le cas d'usage principal de cette fonction est justement de styler un `next/link`
 * comme un bouton depuis un composant serveur, sans imbriquer un `<a>` dans un
 * `<button>` (ce qui serait du HTML invalide et casserait la navigation au clavier) :
 *
 *     <Link href="/rechercher" className={buttonClasses({ variant: 'primary' })}>
 *
 * Elle vit donc dans un module sans directive, que le serveur comme le client peuvent
 * importer. C'est la seule raison de ce découpage — pas une question de goût.
 */

import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonClasses(
  options: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    block?: boolean;
    className?: string;
  } = {},
): string {
  const { variant = 'primary', size = 'md', block = false, className } = options;

  return cn(
    // Base : pilule, focus visible, cible tactile respectée
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-display font-bold tracking-[-0.005em]',
    'border border-transparent rounded-full',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:cursor-not-allowed',
    // Tailles — toutes ≥ 48 px de hauteur, y compris « sm » : c'est une exigence
    // d'accessibilité tactile, pas une préférence esthétique.
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
    /* ⚠️ `success-700` et non `success-500`. Le texte blanc sur `success-500` (#16A34A)
       ne mesure que 3,30:1 — sous le seuil AA de 4,5:1. `success-700` (#166534) atteint
       7,13:1. Le jeton `success-500` reste réservé aux icônes, aux barres de progression
       et aux pastilles, où la couleur ne porte pas de texte. */
    variant === 'success' && 'bg-success-700 text-white hover:bg-success-700/90 disabled:opacity-50',
    block && 'w-full',
    className,
  );
}
