'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { buttonClasses, cn } from '@liguita/ui';

import { APP_NAV } from '../../lib/navigation';
import { Logo } from '../brand/Logo';

/**
 * Barre latérale de l'espace connecté (`/app/*`).
 * Masquée sur mobile (navigation basse via AppBottomNav).
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigation de l'espace"
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex"
    >
      <div className="flex h-[76px] items-center border-b border-ink-100 px-5">
        <Link href="/" aria-label="Liguita — accueil">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {APP_NAV.map((item) => {
            const isActive =
              item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[48px] items-center gap-3 rounded-lg px-3 font-display text-body font-bold transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-ink-100 p-3">
        <Link
          href="/declarer/perdu"
          className={buttonClasses({ variant: 'primary', block: true, size: 'sm' })}
        >
          Déclarer une perte
        </Link>
      </div>
    </aside>
  );
}
