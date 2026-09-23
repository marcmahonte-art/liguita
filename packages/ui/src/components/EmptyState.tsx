import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Illustration ou icône. Un pictogramme neutre est fourni par défaut. */
  icon?: ReactNode;
  /** Action de sortie : « Publier une annonce », « Élargir la recherche »… */
  action?: ReactNode;
  className?: string;
}

/**
 * État vide.
 *
 * Règle produit : un écran vide n'est jamais un cul-de-sac. Il explique ce qui manque
 * et propose systématiquement la prochaine action utile — à N'Djamena, une recherche
 * sans résultat est fréquente au démarrage et doit rester encourageante.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="text-ink-300">{icon ?? <DefaultIcon />}</span>

      <p className="text-h3 text-ink-900">{title}</p>
      {description ? (
        <p className="max-w-md text-body text-ink-500">{description}</p>
      ) : null}

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function DefaultIcon() {
  return (
    <svg
      className="h-12 w-12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M8.5 11h5" />
    </svg>
  );
}
