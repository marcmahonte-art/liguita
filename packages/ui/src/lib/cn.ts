import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Fusionne des classes Tailwind en résolvant les conflits.
 *
 * Sans `twMerge`, une classe passée par un composant appelant (`className="px-8"`) ne
 * pourrait pas remplacer la classe par défaut du composant (`px-4`) : les deux seraient
 * appliquées et l'ordre du CSS déciderait, ce qui rend les composants imprévisibles.
 *
 * @example cn('px-4 py-2', isLarge && 'px-8', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
