'use client';

import { ArrowRight, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { buttonClasses } from '@liguita/ui';

import { AuthDivider, GoogleButton } from '../../../components/auth/GoogleButton';
import { useAuth } from '../../../lib/auth/auth-context';
import { safeRedirectPath } from '../../../lib/auth/redirect';

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpWithPassword, signInWithGoogle, isLoading: authLoading } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [airtelNumber, setAirtelNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  const redirect = safeRedirectPath(searchParams.get('redirect'), '/app');

  /* Le nom du détenteur du compte est le seul nom que l'application affichera, donc il
     est exigé — contrairement au numéro Airtel, qui peut être ajouté plus tard depuis
     « Mon profil » sans bloquer la création du compte. */
  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    password.length >= 8;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const result = await signUpWithPassword({ email, password, firstName, lastName, airtelNumber });
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresConfirmation) {
      setSuccess(true);
      return;
    }
    router.push(redirect);
  }

  async function handleGoogle() {
    if (isGooglePending) return;
    setError(null);
    setIsGooglePending(true);
    const result = await signInWithGoogle(redirect);
    if (result.error) {
      setIsGooglePending(false);
      setError('Inscription Google impossible pour le moment. Réessayez dans un instant.');
    }
    /* Sans erreur, le navigateur quitte la page vers Google. */
  }

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-caption font-bold text-brand-700">
        <UserPlus size={14} />
        Inscription
      </span>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-950">Créer votre compte</h1>
      <p className="mt-2 text-body text-ink-600">
        Votre prénom et votre nom sont ce que les autres utilisateurs verront. Vos
        coordonnées, elles, restent privées.
      </p>

      {success ? (
        <div
          className="mt-6 rounded-xl border border-info-200 bg-info-50 p-4 text-body text-info-800"
          role="status"
        >
          Vérifiez votre boîte email pour confirmer votre compte, puis revenez vous connecter.
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-5">
            <GoogleButton
              onClick={() => void handleGoogle()}
              disabled={isGooglePending || authLoading}
              label="S’inscrire avec Google"
            />
            <AuthDivider />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Prénom
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Jean"
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1.5 block text-body-sm font-bold text-ink-800">
                  Nom
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Dupont"
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-body-sm font-bold text-ink-800">
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-10 pr-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-body-sm font-bold text-ink-800">
                Mot de passe
              </label>
              <div className="relative">
                <LockKeyhole
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8 caractères minimum"
                  className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-10 pr-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="airtel" className="mb-1.5 block text-body-sm font-bold text-ink-800">
                Numéro Airtel Money{' '}
                <span className="font-normal text-ink-500">(facultatif, pour vos récompenses)</span>
              </label>
              <input
                id="airtel"
                type="tel"
                autoComplete="tel"
                value={airtelNumber}
                onChange={(event) => setAirtelNumber(event.target.value)}
                placeholder="+235 66 12 34 56"
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <p className="mt-1.5 text-caption text-ink-500">
                Vous pourrez le compléter à tout moment depuis « Mon profil ».
              </p>
            </div>

            {error ? <p role="alert" className="text-caption font-bold text-danger-500">{error}</p> : null}

            <button
              type="submit"
              disabled={!isValid || isSubmitting || authLoading}
              className={buttonClasses({
                variant: 'primary',
                block: true,
                size: 'lg',
                className: !isValid || isSubmitting ? 'cursor-not-allowed opacity-50' : '',
              })}
            >
              <span>{isSubmitting ? 'Création…' : 'Créer mon compte'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-caption text-ink-600">
        Déjà un compte ?{' '}
        <Link
          href={`/connexion?redirect=${encodeURIComponent(redirect)}`}
          className="font-bold text-brand-700 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionForm />
    </Suspense>
  );
}
