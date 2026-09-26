'use client';

import { LogOut, Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { buttonClasses, cn } from '@liguita/ui';

import { PUBLIC_NAV } from '../../lib/navigation';
import { useAuth } from '../../lib/auth/auth-context';
import { Logo } from '../brand/Logo';

/**
 * En-tête du site public.
 *
 * Hauteur 76 px, dans la fourchette 72–80 px de la maquette.
 *
 * ⚠️ Le bouton de connexion fait **48 px** de haut, et non les 44 px de la maquette.
 * `globals.css` impose `min-height: 48px` à tous les boutons : c'est un plancher
 * d'accessibilité tactile, décidé pour un usage à une main sur téléphone d'entrée de
 * gamme. Un bouton à 44 px serait de toute façon ramené à 48 px par cette règle.
 *
 * ⚠️ **Aucun menu de compte dans la barre du haut.** La navigation publique présente le
 * service — rechercher, objets perdus, objets trouvés, entreprises — et rien d'autre.
 * Le bouton `[Avatar] Jean Dupont ▾` y mêlait l'identité du visiteur à des liens qui ne
 * lui appartiennent pas, et sur une longue liste d'annonces il concurrençait le titre
 * de la page.
 *
 * L'accès au compte reste possible par deux voies, qui sont celles qui comptent :
 *   * le panneau mobile ci-dessous, qui suit l'état de session ;
 *   * le pied de page, pour qui n'a pas de compte.
 * Dans l'espace connecté, c'est `<AccountMenu />` dans `AppTopBar` — le menu du compte
 * n'a donc toujours qu'une seule implémentation.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /* Le panneau mobile suit la session : « Connexion » disparaît une fois connecté, et
     le profil et la déconnexion apparaissent. */
  const { identity, isLoading: authLoading, signOut } = useAuth();

  /* Toute navigation referme le panneau : sans cela, le menu resterait ouvert par-dessus
     la nouvelle page et l'utilisateur devrait le fermer lui-même. */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

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
              <li className="mt-2">
                <Link href="/connexion" className={buttonClasses({ variant: 'primary', block: true })}>
                  Connexion
                </Link>
              </li>
            ) : null}

            {/* Connecté : le compte, qui n'est plus dans la barre du haut. Le nom vient
                de `identity`, donc il ne peut pas différer de celui du menu de l'espace
                connecté. */}
            {!authLoading && identity ? (
              <>
                <li className="mt-2 border-t border-ink-100 pt-2">
                  <Link
                    href="/app/profil"
                    className="flex min-h-[52px] items-center gap-3 rounded-lg px-3 font-display text-body-lg font-bold text-ink-900 hover:bg-ink-50"
                  >
                    <User aria-hidden size={18} className="text-ink-500" />
                    {identity.displayName}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-lg px-3 text-left font-display text-body-lg font-bold text-ink-900 hover:bg-ink-50"
                  >
                    <LogOut aria-hidden size={18} className="text-ink-500" />
                    Se déconnecter
                  </button>
                </li>
              </>
            ) : null}
          </ul>
        </nav>
      </div>
    </header>
  );
}
