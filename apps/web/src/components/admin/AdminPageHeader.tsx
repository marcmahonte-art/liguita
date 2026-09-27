import type { ReactNode } from 'react';

import { cn } from '@liguita/ui';

/**
 * En-tête de page d'administration.
 *
 * ⚠️ Extrait parce que les pages de la console le répétaient à l'identique :
 * sur-titre, titre, description, zone d'actions. Quatre copies d'un même en-tête,
 * c'est quatre occasions de faire diverger l'espacement ou le niveau de titre —
 * et le niveau de titre n'est pas cosmétique, il porte la structure du document
 * pour les lecteurs d'écran.
 *
 * L'administration est une console dense : l'en-tête reste compact (pas de
 * `text-h1`), pour laisser la place aux données.
 */
export function AdminPageHeader({
  overline,
  title,
  description,
  actions,
}: {
  overline?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {overline ? (
          <p className="text-caption font-bold uppercase tracking-wide text-brand-700">{overline}</p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-950">{title}</h1>
        {description ? <p className="mt-1 text-body-sm text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * Carte de statistique.
 *
 * ⚠️ `hint` n'est pas décoratif : un nombre seul ne dit pas s'il est bon. Sur un
 * écran financier, « 12 » sans contexte oblige l'administrateur à aller chercher
 * l'information ailleurs — ce que la carte était censée lui éviter.
 *
 * `tone` colore l'icône. Comme partout dans le design system, la couleur ne porte
 * jamais seule l'information : le libellé et l'indice restent explicites.
 */
export function AdminStatCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'found' | 'lost';
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-bold uppercase tracking-wide text-ink-500">{label}</p>
        <span
          className={cn(
            'shrink-0',
            tone === 'found' && 'text-success-700',
            tone === 'lost' && 'text-brand-700',
            tone === 'neutral' && 'text-ink-400',
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-950">{value}</p>
      {hint ? <p className="mt-0.5 text-2xs text-ink-500">{hint}</p> : null}
    </>
  );

  const className =
    'rounded-xl border border-ink-200 bg-white p-4' +
    (href ? ' transition-colors hover:border-brand-300' : '');

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}
