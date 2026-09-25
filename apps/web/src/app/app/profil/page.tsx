'use client';

import { useState, useTransition } from 'react';

import { Alert, Avatar, buttonClasses, Card, EmptyState, Input } from '@liguita/ui';

import { updateAirtelNumber } from '../../actions/profile';
import { useAuth } from '../../../lib/auth/auth-context';

export default function ProfilPage() {
  const { user } = useAuth();
  const [airtelNumber, setAirtelNumber] = useState(user?.airtel_number ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  if (!user) {
    return <EmptyState title="Non connecté" description="Connectez-vous pour voir votre profil." />;
  }

  async function saveAirtelNumber() {
    startSaving(async () => {
      const result = await updateAirtelNumber(airtelNumber);
      if (!result.ok) {
        setProfileError(result.error ?? 'Enregistrement impossible.');
        setProfileMessage(null);
        return;
      }
      setProfileError(null);
      setProfileMessage('Numéro enregistré. Il sera utilisé pour vos retraits Airtel Money.');
    });
  }

  const name = user.display_name || user.full_name || 'Membre Liguita';
  const whatsapp = user.whatsapp_number || 'À compléter';
  const airtel = user.airtel_number || 'À compléter';

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">Mon profil</h1>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={name} src={user.avatar_url} size="lg" />
          <div>
            <p className="font-display text-body-lg font-bold text-ink-950">{name}</p>
            <p className="text-body-sm text-ink-600">{user.email ?? 'Email non renseigné'}</p>
            <p className="text-caption text-ink-500">
              WhatsApp : {whatsapp} · Airtel Money : {airtel}
            </p>
            <p className="text-caption text-ink-500">
              {user.country_code} · Les coordonnées restent privées
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

      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">
          Destination Airtel Money
        </h2>
        <p className="mt-1 text-body-sm text-ink-600">
          Ce numéro sera utilisé pour vos demandes de retrait. Il reste privé.
        </p>
        {profileError ? (
          <Alert tone="danger" title="Numéro Airtel" className="mt-4">
            {profileError}
          </Alert>
        ) : null}
        {profileMessage ? (
          <Alert tone="success" title="Numéro enregistré" className="mt-4">
            {profileMessage}
          </Alert>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Numéro Airtel Money"
            value={airtelNumber}
            onChange={(event) => setAirtelNumber(event.target.value)}
            placeholder="Ex : 661234567"
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={() => void saveAirtelNumber()}
            disabled={isSaving || !airtelNumber.trim()}
            className={buttonClasses({ variant: 'primary', size: 'lg' })}
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        <p className="mt-3 text-caption text-ink-500">
          Statut : {user.airtel_verified ? 'Vérifié' : 'Vérification opérateur à venir'}
        </p>
      </Card>
    </div>
  );
}
