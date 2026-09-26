'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { buttonClasses, cn } from '@liguita/ui';

import { PUBLIC_NAV } from '../../lib/navigation';
import { useAuth } from '../../lib/auth/auth-context';
import { Logo } from '../brand/Logo';
import { UserMenu } from './UserMenu';

/**
 * En-tête du site public.
 *
 * Hauteur 76 px, dans la fourchette 72–80 px de la maquette.
 *
 * ⚠️ Le bouton de connexion fait **48 px** de haut, et non les 44 px de la maquette.
 * `globals.css` impose `min-height: 48px` à tous les boutons : c'est un plancher
 * d'accessibilité tactile, décidé pour un usage à une main sur téléphone d'entrée de
 * gamme. Un bouton à 44 px serait de toute façon ramené à 48 px par cette règle.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /* Le panneau mobile propose la même chose que la barre du haut : un lien « Connexion »
     ne doit pas rester affiché à quelqu'un qui l'est déjà. */
  const { identity, isLoading: authLoading } = useAuth();

  /* Toute navigation referme le panneau : sans cela, le menu resterait ouvert par-dessus
     la nouvelle page et l'utilisateur devrait le fermer lui-même. */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur-sm">
      <div className="container-liguita flex h-[76px] items-center justify-between gap-4">
        <Link href="/" className="rounded-lg" aria-label="Liguita — retour à l’accueil">
          <Logo priority />
        </Link>

        {/* Navigation de bureau */}
        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-[48px] items-center rounded-lg px-3.5 font-display text-body font-bold transition-colors',
                      isActive ? 'text-brand-700' : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <UserMenu />

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-mobile"
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex size-12 items-center justify-center rounded-lg text-ink-900 hover:bg-ink-100 lg:hidden"
          >
            {isMenuOpen ? <X aria-hidden size={24} /> : <Menu aria-hidden size={24} />}
          </button>
        </div>
      </div>

      {/* Panneau mobile */}
      <div
        id="menu-mobile"
        hidden={!isMenuOpen}
        className="border-t border-ink-200 bg-white lg:hidden"
      >
        <nav aria-label="Navigation principale sur mobile" className="container-liguita py-3">
          <ul className="flex flex-col">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[52px] items-center rounded-lg px-3 font-display text-body-lg font-bold text-ink-900 hover:bg-ink-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {!authLoading && !identity ? (
              <li className="mt-2 sm:hidden">
                <Link href="/connexion" className={buttonClasses({ variant: 'primary', block: true })}>
                  Connexion
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
