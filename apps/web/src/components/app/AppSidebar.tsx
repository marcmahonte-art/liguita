'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonClasses, cn } from '@liguita/ui';

import { useAuth } from '../../lib/auth/auth-context';
import { APP_NAV, APP_NAV_SECONDARY, isNavItemActive, type NavItem } from '../../lib/navigation';
import { Logo } from '../brand/Logo';

/** Hauteur de la ligne de logo, alignée sur la barre supérieure (`h-16`). */
const LOGO_ROW_HEIGHT = 'h-16';

/**
 * Barre latérale de l'espace connecté (`/app/*`).
 * Masquée sur mobile (navigation basse via AppBottomNav).
 *
 * Deux groupes séparés par un filet : le travail d'un côté, les réglages et la sortie de
 * secours de l'autre. Les mélanger produirait une liste de neuf entrées de même poids,
 * où rien n'indique que « Mon profil » n'est pas une tâche.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isStaff = user?.app_role === 'MODERATOR' || user?.app_role === 'ADMIN';
  const moderationItem: NavItem = {
    href: '/app/moderation',
    label: 'Modération',
    icon: ShieldAlert,
  };
  const navItems: readonly NavItem[] = isStaff ? [...APP_NAV, moderationItem] : APP_NAV;

  return (
    <aside
      aria-label="Navigation de l'espace"
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex"
    >
      <div className={cn('flex shrink-0 items-center px-5', LOGO_ROW_HEIGHT)}>
        <Link href="/app" aria-label="Liguita — tableau de bord" className="flex items-center">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <NavLink item={item} isActive={isActive} />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pied de barre : aide et profil, visuellement détachés du travail. */}
      <div className="shrink-0 border-t border-ink-100 p-3">
        <ul className="flex flex-col gap-0.5">
          {APP_NAV_SECONDARY.map((item) => (
            <li key={item.href}>
              <NavLink item={item} isActive={isNavItemActive(pathname, item.href)} />
            </li>
          ))}
        </ul>

        <Link
          href="/declarer/perdu"
          className={cn(
            buttonClasses({ variant: 'primary', block: true, size: 'sm' }),
            'mt-3',
          )}
        >
          Déclarer une perte
        </Link>

        {/* Signature de marque.
            Le trait rouge suffit : une illustration de plus ajouterait du bruit sous une
            liste de navigation sans rien apprendre à l'utilisateur. */}
        <p className="mt-4 flex items-center gap-2 px-1 font-display text-caption font-bold text-ink-400">
          <span className="h-px w-6 shrink-0 bg-brand-500" aria-hidden />
          Ensemble, retrouvons ce qui compte.
        </p>
      </div>
    </aside>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-lg px-3 font-display text-body font-bold transition-colors',
        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
      )}
    >
      <Icon size={18} aria-hidden className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
