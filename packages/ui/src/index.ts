/**
 * @liguita/ui — design system.
 *
 * Point d'entrée unique :
 * ```tsx
 * import { Button, Money, tokens } from '@liguita/ui';
 * ```
 *
 * Accès ciblé (recommandé côté serveur, pour ne pas embarquer les composants clients) :
 * ```tsx
 * import { brand } from '@liguita/ui/tokens';
 * import { cn } from '@liguita/ui/cn';
 * ```
 */

export * from './tokens';
export * from './lib/cn';
export * from './lib/contrast';
export * from './lib/button-classes';
export * from './lib/initials';
export * from './components';
