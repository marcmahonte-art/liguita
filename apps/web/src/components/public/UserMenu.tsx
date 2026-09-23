'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Avatar, buttonClasses, cn } from '@liguita/ui';

import { useAuth } from '../../lib/auth/auth-context';

/** Nom affiché : display_name, full_name, ou à défaut le numéro masqué. */
function displayNameOf(profile: {
  display_name: string | null;
  full_name: string | null;
  phone: string;
}): string {
  if (profile.display_name) return profile.display_name;
  if (profile.full_name) return profile.full_name;
  return profile.phone ? `+${profile.phone}` : 'Mon compte';
}

export function UserMenu() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-ink-100" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href="/connexion"
        className={cn(buttonClasses({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}
      >
        Connexion
      </Link>
    );
  }

  const name = displayNameOf(user);

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/app"
        className={cn(buttonClasses({ variant: 'outline', size: 'sm' }), 'hidden sm:inline-flex')}
      >
        <Avatar name={name} src={user.avatar_url} size="sm" className="size-6 text-2xs" />
        <span className="max-w-28 truncate">{name}</span>
        <span className="sr-only">— Mon espace</span>
      </Link>

      <Link
        href="/app"
        aria-label="Mon espace"
        className={cn(
          buttonClasses({ variant: 'outline', size: 'sm' }),
          'sm:hidden inline-flex size-11 !px-0 justify-center',
        )}
      >
        <Avatar name={name} src={user.avatar_url} size="sm" className="size-6 text-2xs" />
      </Link>

      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className={cn(
          buttonClasses({ variant: 'ghost', size: 'sm' }),
          'inline-flex size-11 !px-0 justify-center',
        )}
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
