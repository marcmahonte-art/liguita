'use client';

import { Bell, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { buttonClasses, cn } from '@liguita/ui';
import { formatMoney } from '@liguita/core/pricing';

import { APP_NAV, APP_NAV_SECONDARY, isNavItemActive } from '../../lib/navigation';
import { AccountMenu } from '../auth/AccountMenu';
import { Logo } from '../brand/Logo';

export interface AppTopBarProps {
  /** Nombre de notifications non lues — pastille sur la cloche. */
  unreadCount: number;
  /** Solde disponible, pour le raccourci portefeuille. `null` si le portefeuille est inaccessible. */
  availableBalance: number | null;
}

/**
 * Barre supérieure de l'espace connecté.
 *
 * Trois zones, une seule ligne : identité à gauche, recherche au centre, compte à droite.
 * La recherche est ici — et nullepart ailleurs dans la coquille — parce que c'est
 * l'action que l'on doit pouvoir lancer depuis n'importe quel écran sans y penser.
 *
 * Le logo n'apparaît que sous `lg` : au-delà, la barre latérale porte déjà l'identité,
 * et deux logos sur un même écran sont deux fois la même information.
 *
 * ⚠️ Le menu du compte n'est pas écrit ici : c'est `<AccountMenu />`, le même composant
 * que celui de l'en-tête public. Les deux surfaces affichent le même nom, parce qu'elles
 * lisent la même valeur.
 */
export function AppTopBar({ unreadCount, availableBalance }: AppTopBarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /* La navigation change de page : tout ce qui est ouvert doit se refermer, sinon le
     menu survit à la page que l'utilisateur vient de quitter. */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        {/* Identité — sous lg seulement, la barre latérale s'en charge au-delà. */}
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-espace"
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-900 transition-colors hover:bg-ink-100"
          >
            {isMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
          <Link href="/app" aria-label="Liguita — tableau de bord" className="flex items-center">
            <Logo height={30} />
          </Link>
        </div>

        {/* Recherche — action principale, disponible sur tous les écrans.
            La largeur est plafonnée et centrée : sur un grand écran, une barre qui
            s'étire d'un bord à l'autre n'est plus une barre de recherche, c'est un
            filet, et le centre de gravité de l'écran se déplace vers la gauche.

            ⚠️ Sous 640 px, le champ ne laisserait qu'une centaine de pixels — le
            placeholder serait coupé au milieu d'un mot, ce qui est pire que pas de
            champ du tout. On le remplace donc par un bouton-icône vers la page de
            recherche : même destination, une seule touche, et l'en-tête reste lisible. */}
        <form
          action="/rechercher"
          method="get"
          className="mx-auto hidden w-full max-w-[560px] flex-1 sm:block"
          role="search"
        >
          <div className="relative w-full">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              id="topbar-search"
              type="search"
              name="q"
              placeholder="Rechercher un objet, une ville ou un mot-clé…"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-body text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </form>

        <Link
          href="/rechercher"
          aria-label="Rechercher un objet"
          className={cn(
            buttonClasses({ variant: 'ghost', size: 'sm' }),
            'inline-flex size-11 !px-0 justify-center sm:hidden',
          )}
        >
          <Search size={20} aria-hidden />
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {availableBalance !== null ? (
            <Link
              href="/app/portefeuille"
              className={cn(
                buttonClasses({ variant: 'ghost', size: 'sm' }),
                'hidden !min-h-[44px] gap-2 px-3 sm:inline-flex',
              )}
            >
              <span className="font-display text-body font-extrabold tabular text-ink-950">
                {formatMoney(availableBalance)}
              </span>
              <span className="text-caption text-ink-500">Récompenses</span>
            </Link>
          ) : null}

          <Link
            href="/app/notifications"
            aria-label={
              unreadCount > 0 ? `Notifications (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})` : 'Notifications'
            }
            className={cn(
              buttonClasses({ variant: 'ghost', size: 'sm' }),
              'relative inline-flex size-11 !px-0 justify-center',
            )}
          >
            <Bell size={19} aria-hidden />
            {unreadCount > 0 ? (
              /* Pastille + libellé dans l'attribut `aria-label` : le nombre ne repose
                 jamais sur la seule couleur. */
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-2xs font-bold leading-[18px] text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>

          <AccountMenu
            align="right"
            triggerClassName="!min-h-[44px]"
            showNameClassName="hidden max-w-24 truncate md:inline"
          />
        </div>
      </div>

      {/* Menu mobile — même contenu et même état actif que la barre latérale, pour que
          les deux surfaces ne se contredisent pas. */}
      <div
        id="menu-espace"
        hidden={!isMenuOpen}
        className="border-t border-ink-100 bg-white lg:hidden"
      >
        <nav aria-label="Navigation de l'espace" className="max-h-[70vh] overflow-y-auto p-2">
          <ul className="flex flex-col">
            {[...APP_NAV, ...APP_NAV_SECONDARY].map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-[48px] items-center gap-3 rounded-lg px-3 font-display text-body font-bold transition-colors',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-800 hover:bg-ink-50',
                    )}
                  >
                    <Icon size={18} aria-hidden className="shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/declarer/perdu"
            className={cn(buttonClasses({ variant: 'primary', block: true, size: 'sm' }), 'mt-2')}
          >
            Déclarer une perte
          </Link>
        </nav>
      </div>
    </header>
  );
}
