'use client';

import { useEffect, useState } from 'react';

import { Alert, Avatar, Card, Skeleton } from '@liguita/ui';

import { listAdminUsers, type AdminUserRow } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';
import { authProviderLabel, toAuthProvider } from '../../../lib/auth/identity';

/**
 * Console d'administration — liste des comptes.
 *
 * ⚠️ La ligne s'identifie par le **nom** puis par l'email. Le numéro de téléphone
 * n'est plus l'identifiant d'un compte : c'est une donnée de contact, et l'afficher
 * comme identifiant dans une liste que lisent des modérateurs revenait à en faire le
 * nom du compte. La méthode de connexion est affichée en toutes lettres.
 */
export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    listAdminUsers().then((result) => {
      setItems(result.items);
      setError(result.error ?? null);
    });
  }, [authLoading, user]);

  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Utilisateurs</h1>
      {error ? <Alert tone="danger" title={error} /> : null}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={item.displayName} src={item.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-display font-bold text-ink-950">
                    {item.displayName}
                  </p>
                  <p className="truncate text-caption text-ink-500">
                    {item.email ?? 'Aucun email'} · {authProviderLabel(toAuthProvider(item.authProvider))}
                  </p>
                </div>
              </div>
              <span className="text-caption font-bold text-ink-600">
                {item.appRole}
                {item.isBlocked ? ' · bloqué' : ''}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
