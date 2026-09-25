'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@liguita/ui';

import { APP_BOTTOM_NAV, isNavItemActive } from '../../lib/navigation';

/**
 * Navigation du bas (mobile) pour `/app/*`.
 * Cinq entrées, cibles ≥ 56 px, reflets de la barre latérale.
 */
export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {APP_BOTTOM_NAV.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pt-1 text-2xs font-bold transition-colors',
                  isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                <Icon size={20} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
