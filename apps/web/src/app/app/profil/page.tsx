'use client';

import { Avatar, Card, EmptyState } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';

export default function ProfilPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <EmptyState title="Non connecté" description="Connectez-vous pour voir votre profil." />
    );
  }

  const name = user.display_name || user.full_name || `+${user.phone}`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
        Mon profil
      </h1>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={name} src={user.avatar_url} size="lg" />
          <div>
            <p className="font-display text-body-lg font-bold text-ink-950">{name}</p>
            <p className="text-body-sm text-ink-600">+{user.phone}</p>
            <p className="text-caption text-ink-500">
              {user.phone_verified ? 'Numéro vérifié' : 'Numéro non vérifié'} ·{' '}
              {user.country_code}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-caption font-bold text-ink-500">Rôle</dt>
            <dd className="text-body text-ink-900">{user.app_role}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Score de confiance</dt>
            <dd className="text-body text-ink-900">{user.trust_score} / 100</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Ville</dt>
            <dd className="text-body text-ink-900">{user.city_slug ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Membre depuis</dt>
            <dd className="text-body text-ink-900">
              {new Date(user.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
