'use client';

import { Bell, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Avatar, buttonClasses, cn } from '@liguita/ui';

import { useAuth } from '../../lib/auth/auth-context';
import { APP_NAV } from '../../lib/navigation';

function displayNameOf(profile: {
  display_name: string | null;
  full_name: string | null;
  phone: string;
}): string {
  if (profile.display_name) return profile.display_name;
  if (profile.full_name) return profile.full_name;
  return profile.phone ? `+${profile.phone}` : 'Mon compte';
}

export function AppTopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  const name = user ? displayNameOf(user) : '';

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-[64px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-900 hover:bg-ink-100"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link href="/app" className="font-display text-body-lg font-extrabold text-ink-950">
            Mon espace
          </Link>
        </div>

        {/* Barre de recherche globale (desktop uniquement) */}
        <form
          action="/rechercher"
          method="get"
          className="hidden flex-1 max-w-md lg:flex"
          role="search"
        >
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
              aria-hidden
            />
            <input
              id="topbar-search"
              type="search"
              name="q"
              placeholder="Rechercher un objet, une ville, un mot-clé…"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-4 text-body text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/app/notifications"
            aria-label="Notifications"
            className={cn(
              buttonClasses({ variant: 'ghost', size: 'sm' }),
              'inline-flex size-11 !px-0 justify-center',
            )}
          >
            <Bell size={18} />
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/app/profil"
                className={cn(
                  buttonClasses({ variant: 'outline', size: 'sm' }),
                  'hidden sm:inline-flex',
                )}
              >
                <Avatar name={name} src={user.avatar_url} size="sm" className="size-6 text-2xs" />
                <span className="max-w-28 truncate">{name}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(buttonClasses({ variant: 'ghost', size: 'sm' }), 'text-ink-600')}
              >
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Menu mobile repliable */}
      {isMenuOpen ? (
        <nav aria-label="Navigation espace" className="border-t border-ink-100 bg-white lg:hidden">
          <ul className="flex flex-col p-2">
            {APP_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[48px] items-center rounded-lg px-3 font-display text-body font-bold text-ink-800 hover:bg-ink-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
