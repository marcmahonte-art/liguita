'use client';

import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';

function firstName(profile: {
  display_name: string | null;
  full_name: string | null;
  phone: string;
}): string {
  if (profile.display_name) return profile.display_name.split(' ')[0] ?? profile.display_name;
  if (profile.full_name) return profile.full_name.split(' ')[0] ?? profile.full_name;
  return 'toi';
}

export function HeroBanner() {
  const { user } = useAuth();
  const name = user ? firstName(user) : '…';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-pink-50 p-6 shadow-xs">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-brand-100/40"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 right-16 size-28 rounded-full bg-pink-100/50"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Bonjour {name} 👋
          </h1>
          <p className="mt-2 text-body text-ink-600">
            Vous pouvez à la fois rechercher un objet et signaler un objet trouvé.{' '}
            Chaque action compte !
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/rechercher"
              id="hero-search-btn"
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
            >
              🔍 Rechercher un objet
            </Link>
            <Link
              href="/declarer/trouve"
              id="hero-declare-btn"
              className={buttonClasses({ variant: 'outline', size: 'sm' })}
            >
              + Déclarer un objet trouvé
            </Link>
          </div>
        </div>

        <div
          aria-hidden
          className="hidden shrink-0 sm:flex sm:size-32 sm:items-center sm:justify-center"
        >
          <span className="text-7xl select-none">📍</span>
        </div>
      </div>
    </div>
  );
}
