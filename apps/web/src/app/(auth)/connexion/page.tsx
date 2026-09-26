'use client';

import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { buttonClasses } from '@liguita/ui';

import { AuthDivider, GoogleButton } from '../../../components/auth/GoogleButton';
import { useAuth } from '../../../lib/auth/auth-context';
import { safeRedirectPath } from '../../../lib/auth/redirect';

/**
 * Messages d'échec de connexion.
 *
 * ⚠️ Table **fermée** : le paramètre `?erreur=` originate de l'URL, et le message
 * d'erreur de Supabase ou de Google peut contenir des URL internes, des noms de tables
 * ou des fragments de configuration. On n'affiche donc jamais la chaîne brute — on
 * traduit un code connu, et tout code inconnu tombe sur la même phrase neutre.
 */
const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: 'Connexion Google annulée. Vous pouvez recommencer quand vous voulez.',
  oauth_missing_code: 'La connexion Google n’a pas abouti. Reprenez la connexion.',
  oauth_exchange_failed:
    'Connexion Google impossible pour le moment. Réessayez, ou utilisez votre email et votre mot de passe.',
  invalid_credentials: 'Email ou mot de passe incorrect.',
};

function messageFor(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? 'Connexion impossible pour le moment. Réessayez dans un instant.';
}

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, signInWithGoogle, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  const redirect = safeRedirectPath(searchParams.get('redirect'), '/app');
  const isValid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;
  const providerError = messageFor(searchParams.get('erreur'));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const result = await signInWithPassword(email, password);
    setIsSubmitting(false);
    if (result.error) {
      /* Le message brut de Supabase distingue utilement « email inconnu » de « mot de
         passe faux » en développement, mais « Invalid login credentials » n'aide
         personne : on le remplace par une formulation qui ne distingue rien. */
      setError(
        /invalid login credentials/i.test(result.error)
          ? 'Email ou mot de passe incorrect.'
          : 'Connexion impossible. Réessayez dans un instant.',
      );
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
      setError('Connexion Google impossible pour le moment. Réessayez dans un instant.');
    }
    /* Sans erreur, le navigateur quitte la page vers Google : ne pas remettre l'état. */
  }

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-caption font-bold text-brand-700">
        <LockKeyhole size={14} />
        Connexion sécurisée
      </span>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-950">Ravi de vous revoir</h1>
      <p className="mt-2 text-body text-ink-600">
        Connectez-vous avec Google, ou avec votre adresse email et votre mot de passe.
      </p>

      {providerError ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-danger-200 bg-danger-50 p-3 text-body-sm font-bold text-danger-700"
        >
          {providerError}
        </p>
      ) : null}

      <div className="mt-6 space-y-5">
        <GoogleButton onClick={() => void handleGoogle()} disabled={isGooglePending || authLoading} />
        <AuthDivider />
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8 caractères minimum"
              className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-10 pr-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              minLength={8}
              required
            />
          </div>
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
          <span>{isSubmitting ? 'Connexion…' : 'Se connecter'}</span>
          <ArrowRight size={18} />
        </button>
      </form>
      <p className="mt-6 text-center text-caption text-ink-600">
        Pas encore de compte ?{' '}
        <Link
          href={`/inscription?redirect=${encodeURIComponent(redirect)}`}
          className="font-bold text-brand-700 hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
