'use client';

import { LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Alert, Avatar, buttonClasses, Card, EmptyState, Input } from '@liguita/ui';

import { updateAirtelNumber, updateIdentity } from '../../actions/profile';
import { useAuth } from '../../../lib/auth/auth-context';
import { authProviderLabel, formatPhone } from '../../../lib/auth/identity';

/**
 * « Mon profil » — l'identité et la façon de la corriger.
 *
 * ⚠️ **Une seule page édite l'identité.** Prénom, nom et téléphone se changent ici, et
 * nulle part ailleurs dans l'application. L'en-tête, le menu utilisateur et le tableau de
 * bord lisent la même valeur qu'elle vienne d'être saisie ou de Google.
 *
 * Ce que la page n'affiche pas, et c'est délibéré : l'identifiant interne du compte, les
 * noms de tables, l'identifiant du fournisseur d'authentification. Ces informations
 * n'aident personne et n'ont pas leur place dans une page que l'on lit comme une fiche
 * personnelle. La « méthode de connexion » est un libellé en toutes lettres — « Google »,
 * « Email et mot de passe » — jamais un jeton technique.
 */
export default function ProfilPage() {
  const { user, identity, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [airtelNumber, setAirtelNumber] = useState('');

  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityMessage, setIdentityMessage] = useState<string | null>(null);
  const [airtelError, setAirtelError] = useState<string | null>(null);
  const [airtelMessage, setAirtelMessage] = useState<string | null>(null);
  const [isSavingIdentity, startSavingIdentity] = useTransition();
  const [isSavingAirtel, startSavingAirtel] = useTransition();

  /* Les champs se remplissent à partir du profil chargé. Sans cela, la page se
     remplirait d'un coup à l'arrivée de la session et effacerait ce que l'utilisateur
     est en train de taper si le profil se recharge en arrière-plan. */
  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name ?? '');
    setLastName(user.last_name ?? '');
    setPhone(user.phone ?? '');
    setAirtelNumber(user.airtel_number ?? '');
  }, [user]);

  if (!user || !identity) {
    return <EmptyState title="Non connecté" description="Connectez-vous pour voir votre profil." />;
  }

  async function saveIdentity(event: React.FormEvent) {
    event.preventDefault();
    if (isSavingIdentity) return;
    setIdentityError(null);
    setIdentityMessage(null);
    startSavingIdentity(async () => {
      const result = await updateIdentity({ firstName, lastName, phone });
      if (!result.ok) {
        setIdentityError(result.error ?? 'Enregistrement impossible.');
        return;
      }
      /* Le contexte d'authentification est la source de vérité : sans ce rechargement,
         l'en-tête et le menu utilisateur continuaient d'afficher l'ancien nom jusqu'au
         rechargement suivant de la page. */
      await refreshProfile();
      setIdentityMessage('Profil mis à jour.');
    });
  }

  async function saveAirtelNumber() {
    startSavingAirtel(async () => {
      const result = await updateAirtelNumber(airtelNumber);
      if (!result.ok) {
        setAirtelError(result.error ?? 'Enregistrement impossible.');
        setAirtelMessage(null);
        return;
      }
      await refreshProfile();
      setAirtelError(null);
      setAirtelMessage('Numéro enregistré. Il sera utilisé pour vos retraits Airtel Money.');
    });
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  const displayPhone = formatPhone(identity.phone, user.country_code) ?? 'Non renseigné';
  const displayAirtel = formatPhone(user.airtel_number, user.country_code);
  const displayWhatsapp = formatPhone(user.whatsapp_number, user.country_code);
  /* Pas de photo de profil : on l'annonce, plutôt que de laisser croire que
     l'utilisateur pourrait ajouter une image en cliquant sur l'avatar. */
  const photoSource =
    identity.avatarUrl ?? 'Aucune photo : votre avatar est généré à partir de vos initiales.';

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">Mon profil</h1>

      {/* ------------------------------------------------------------------ Identité */}
      <Card>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar name={identity.displayName} src={identity.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="font-display text-body-lg font-bold text-ink-950">
              {identity.displayName}
            </p>
            <p className="text-body-sm text-ink-600">{user.email ?? 'Email non renseigné'}</p>
            <p className="mt-0.5 text-caption text-ink-500">{photoSource}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-caption font-bold text-ink-500">Prénom</dt>
            <dd className="text-body text-ink-900">{identity.firstName ?? 'À compléter'}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Nom</dt>
            <dd className="text-body text-ink-900">{identity.lastName ?? 'À compléter'}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Email</dt>
            <dd className="truncate text-body text-ink-900">{user.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Téléphone</dt>
            <dd className="text-body text-ink-900">{displayPhone}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">Méthode de connexion</dt>
            <dd className="flex items-center gap-1.5 text-body text-ink-900">
              <ShieldCheck size={15} aria-hidden className="text-ink-400" />
              {authProviderLabel(identity.authProvider)}
            </dd>
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

      {/* ------------------------------------------------------------------ Modification */}
      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">Modifier mon identité</h2>
        <p className="mt-1 text-body-sm text-ink-600">
          C’est ce nom que les autres utilisateurs voient. Le prénom et le nom restent
          modifiables, y compris après une inscription avec Google.
        </p>

        {identityError ? (
          <Alert tone="danger" title="Modification refusée" className="mt-4">
            {identityError}
          </Alert>
        ) : null}
        {identityMessage ? (
          <Alert tone="success" title="Profil mis à jour" className="mt-4">
            {identityMessage}
          </Alert>
        ) : null}

        <form onSubmit={saveIdentity} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prénom"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              maxLength={60}
              disabled={isSavingIdentity}
            />
            <Input
              label="Nom"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              maxLength={60}
              disabled={isSavingIdentity}
            />
          </div>
          <Input
            label="Téléphone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            placeholder="+235 66 12 34 56"
            hint="Utilisé pour les alertes. Il n’est jamais affiché publiquement."
            disabled={isSavingIdentity}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSavingIdentity || firstName.trim() === ''}
              className={buttonClasses({ variant: 'primary', size: 'lg' })}
            >
              {isSavingIdentity ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={buttonClasses({ variant: 'ghost', size: 'lg' })}
            >
              <LogOut size={17} aria-hidden />
              Se déconnecter
            </button>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------------------------ Coordonnées */}
      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">Coordonnées de paiement</h2>
        <p className="mt-1 text-body-sm text-ink-600">
          Le numéro Airtel Money reçoit vos récompenses. Il reste privé et n’est jamais
          partagé avec un tiers.
        </p>
        {airtelError ? (
          <Alert tone="danger" title="Numéro Airtel" className="mt-4">
            {airtelError}
          </Alert>
        ) : null}
        {airtelMessage ? (
          <Alert tone="success" title="Numéro enregistré" className="mt-4">
            {airtelMessage}
          </Alert>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Numéro Airtel Money"
            value={airtelNumber}
            onChange={(event) => setAirtelNumber(event.target.value)}
            placeholder="Ex : 661234567"
            containerClassName="sm:flex-1"
            disabled={isSavingAirtel}
          />
          <button
            type="button"
            onClick={() => void saveAirtelNumber()}
            disabled={isSavingAirtel || !airtelNumber.trim()}
            className={buttonClasses({ variant: 'primary', size: 'lg' })}
          >
            {isSavingAirtel ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-caption font-bold text-ink-500">Airtel Money</dt>
            <dd className="text-body text-ink-900">{displayAirtel ?? 'À compléter'}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-ink-500">WhatsApp</dt>
            <dd className="text-body text-ink-900">{displayWhatsapp ?? 'Non renseigné'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-caption text-ink-500">
          Airtel Money : {user.airtel_verified ? 'Vérifié' : 'Vérification opérateur à venir'} ·
          {' '}WhatsApp : {user.whatsapp_verified ? 'Vérifié' : 'Non vérifié'}
        </p>
      </Card>
    </div>
  );
}
