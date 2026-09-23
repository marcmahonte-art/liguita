'use client';

import { ArrowRight, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { buttonClasses } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';

const PHONE_LENGTH = 8;

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPhone, isLoading: authLoading } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirect = searchParams.get('redirect') ?? '/';
  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === PHONE_LENGTH;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signInWithPhone(digits);

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    const params = new URLSearchParams({ phone: digits });
    if (redirect && redirect.startsWith('/')) params.set('redirect', redirect);
    router.push(`/otp?${params.toString()}`);
  }

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-caption font-bold text-brand-700">
        <UserPlus size={14} />
        Inscription
      </span>

      <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-950">
        Créer votre compte
      </h1>
      <p className="mt-2 text-body text-ink-600">
        Un numéro tchadien suffit. Nous vous envoyons un code à 6 chiffres pour valider
        votre compte.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="phone" className="block text-body-sm font-bold text-ink-800 mb-1.5">
            Numéro de téléphone <span className="text-brand-500">*</span>
          </label>
          <div className="flex items-center rounded-xl border border-ink-200 bg-white focus-within:border-brand-500">
            <span
              aria-hidden="true"
              className="border-r border-ink-200 bg-ink-50 px-3.5 py-3 font-display text-body font-bold text-ink-700"
            >
              +235
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={11}
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/[^\d ]/g, ''))}
              placeholder="66 12 34 56"
              className="w-full bg-transparent px-3.5 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:outline-none"
              required
            />
          </div>
          <p className="mt-1.5 text-2xs text-ink-500">8 chiffres exactement, sans +235.</p>
        </div>

        {error && (
          <p role="alert" className="text-caption font-bold text-danger-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting || authLoading}
          className={buttonClasses({
            variant: 'primary',
            block: true,
            size: 'lg',
            className: !isValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
          })}
        >
          <span>{isSubmitting ? 'Envoi en cours…' : 'Recevoir le code'}</span>
          <ArrowRight size={18} />
        </button>
      </form>

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
