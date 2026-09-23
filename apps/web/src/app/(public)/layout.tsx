import type { ReactNode } from 'react';

import { SiteFooter } from '../../components/public/SiteFooter';
import { SiteHeader } from '../../components/public/SiteHeader';

/**
 * Coquille du site public.
 *
 * Le groupe `(public)` n'apparaît pas dans l'URL : `/` reste `/`.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Lien d'évitement : premier élément focusable, il permet de sauter la navigation
          au clavier sans la traverser à chaque changement de page. */}
      <a
        href="#contenu"
        className="sr-only-focusable fixed left-4 top-4 z-50 rounded-lg bg-ink-900 px-4 py-3 font-display text-body font-bold text-white"
      >
        Aller au contenu principal
      </a>

      <SiteHeader />

      <main id="contenu" className="flex-1">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
