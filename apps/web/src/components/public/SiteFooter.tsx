import Link from 'next/link';

import { Logo } from '../brand/Logo';
import { FOOTER_COLUMNS } from '../../lib/navigation';

/**
 * Pied de page public.
 *
 * Fond clair et non sombre : la direction artistique demande beaucoup d'espace blanc et
 * très peu d'ombres. Un pied de page sombre créerait une rupture visuelle que le reste
 * de la page ne prépare pas.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-white">
      <div className="container-liguita py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[38ch] text-body text-ink-500">
              Retrouvez vos objets perdus, déclarez ceux que vous avez trouvés. Simple,
              rapide et sécurisé.
            </p>
            <p className="mt-4 text-caption text-ink-500">
              N&apos;Djamena, Tchad
              <br />
              Les montants sont exprimés en francs CFA (FCFA).
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-display text-overline font-bold uppercase tracking-[0.12em] text-ink-500">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-[44px] items-center text-body text-ink-700 hover:text-brand-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-ink-500">
            © {new Date().getUTCFullYear()} Liguita. Tous droits réservés.
          </p>
          <p className="text-caption text-ink-500">
            Données personnelles traitées conformément à la loi tchadienne n° 007/PR/2015.
          </p>
        </div>
      </div>
    </footer>
  );
}
