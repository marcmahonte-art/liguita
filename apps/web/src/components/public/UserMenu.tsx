'use client';

import Link from 'next/link';

import { buttonClasses, cn } from '@liguita/ui';

import { useAuth } from '../../lib/auth/auth-context';
import { AccountMenu } from '../auth/AccountMenu';

/**
 * Entrée « compte » de l'en-tête public.
 *
 * Ce composant ne résout plus aucun nom : il délègue à `<AccountMenu />`, le composant
 * unique du produit, qui lit `identity` dans le contexte d'authentification. Il ne
 * garde que l'état déconnecté — un lien « Connexion » — que l'en-tête public seul
 * affiche.
 *
 * Déconnecté, l'en-tête propose une seule action. Connecté, il propose le même menu que
 * l'espace connecté : mêmes entrées, même ordre, même identité.
 */
export function UserMenu() {
  const { identity, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-9 w-28 animate-pulse rounded-lg bg-ink-100" aria-hidden="true" />;
  }

  if (!identity) {
    return (
      <Link
        href="/connexion"
        className={cn(buttonClasses({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}
      >
        Connexion
      </Link>
    );
  }

  return (
    <AccountMenu
      align="left"
      variant="outline"
      avatarClassName="size-6 text-2xs"
      showNameClassName="max-w-28 truncate sm:inline"
      loadingClassName="h-9 w-28"
    />
  );
}
