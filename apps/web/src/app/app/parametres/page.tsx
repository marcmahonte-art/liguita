'use client';

import { ACTIVE_CITIES, findCity } from '@liguita/config';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { Alert, Avatar, buttonClasses, Card, EmptyState, Select } from '@liguita/ui';

import { updatePreferences } from '../../actions/profile';
import { useAuth } from '../../../lib/auth/auth-context';
import { authProviderLabel } from '../../../lib/auth/identity';

/**
 * « Paramètres » — les réglages du compte qui ne sont pas de l'identité.
 *
 * ⚠️ Cette page **n'édite pas le prénom, le nom, le téléphone, l'email ni l'avatar**.
 * Tout cela se change sur « Mon profil », à un seul endroit. Dupliquer ces champs ici
 * créerait deux formulaires pour les mêmes colonnes, et l'un des deux finirait par être
 * faux : c'est exactement le « plusieurs systèmes de profil » que la refonte supprime.
 *
 * Elle affiche l'identité en lecture seule, avec un lien vers la page qui l'édite.
 */
const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
] as const;

export default function ParametresPage() {
  const { user, identity, refreshProfile } = useAuth();
  const [citySlug, setCitySlug] = useState('');
  const [locale, setLocale] = useState('fr');
  const [isSamaritan, setIsSamaritan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (!user) return;
    setCitySlug(user.city_slug ?? '');
    setLocale(user.locale ?? 'fr');
    setIsSamaritan(user.is_samaritan);
  }, [user]);

  if (!user || !identity) {
    return <EmptyState title="Non connecté" description="Connectez-vous pour voir vos paramètres." />;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    setError(null);
    setMessage(null);
    startSaving(async () => {
      const result = await updatePreferences({ citySlug, locale, isSamaritan });
      if (!result.ok) {
        setError(result.error ?? 'Enregistrement impossible.');
        return;
      }
      await refreshProfile();
      setMessage('Préférences enregistrées.');
    });
  }

  const city = findCity(citySlug);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">Paramètres</h1>

      {/* ------------------------------------------------------------------ Compte */}
      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">Compte</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={identity.displayName} src={identity.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="font-display text-body font-bold text-ink-950">{identity.displayName}</p>
            <p className="truncate text-body-sm text-ink-600">{user.email ?? '—'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-500">
              <ShieldCheck size={14} aria-hidden />
              {authProviderLabel(identity.authProvider)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-body-sm text-ink-600">
          Votre nom, votre prénom, votre photo et votre numéro se changent sur la page{' '}
          <Link href="/app/profil" className="font-bold text-brand-700 hover:underline">
            Mon profil
          </Link>
          .
        </p>
      </Card>

      {/* ------------------------------------------------------------------ Préférences */}
      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">Préférences</h2>
        <p className="mt-1 text-body-sm text-ink-600">
          Votre ville détermine les alertes que vous recevez et les objets qui vous sont
          proposés en priorité.
        </p>

        {error ? (
          <Alert tone="danger" title="Enregistrement refusé" className="mt-4">
            {error}
          </Alert>
        ) : null}
        {message ? (
          <Alert tone="success" title="Préférences enregistrées" className="mt-4">
            {message}
          </Alert>
        ) : null}

        <form onSubmit={save} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Ville"
              value={citySlug}
              onChange={(event) => setCitySlug(event.target.value)}
              options={ACTIVE_CITIES.map((item) => ({ value: item.slug, label: item.name }))}
              placeholder="Choisir une ville"
              disabled={isSaving}
            />
            <Select
              label="Langue de l’interface"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              options={LANGUAGES.map((item) => ({ value: item.value, label: item.label }))}
              disabled={isSaving}
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50/60 p-4">
            <input
              type="checkbox"
              checked={isSamaritan}
              onChange={(event) => setIsSamaritan(event.target.checked)}
              disabled={isSaving}
              className="mt-0.5 size-5 shrink-0 accent-brand-500"
            />
            <span>
              <span className="block text-body font-bold text-ink-900">
                Je veux être notifié en priorité
              </span>
              <span className="block text-caption text-ink-600">
                Vous serez contacté en premier quand un objet vous appartenant est
                retrouvé. Votre nom n’est jamais transmis sans votre accord.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving || citySlug === ''}
              className={buttonClasses({ variant: 'primary', size: 'lg' })}
            >
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {city ? (
              <span className="text-caption text-ink-500">
                Alertes centrées sur {city.name}.
              </span>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">Mes alertes</h2>
        <p className="mt-1 text-body-sm text-ink-600">
          Les recherches enregistrées qui vous préviennent lorsqu’un objet correspond.
        </p>
        <Link
          href="/app/annonces"
          className={buttonClasses({ variant: 'outline', size: 'md', className: 'mt-4' })}
        >
          Gérer mes annonces
          <ArrowRight size={16} aria-hidden />
        </Link>
      </Card>
    </div>
  );
}
