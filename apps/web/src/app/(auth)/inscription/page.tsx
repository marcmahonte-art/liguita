'use client';

import { ArrowRight, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { buttonClasses } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';

function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpWithPassword, isLoading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [airtelNumber, setAirtelNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirect = searchParams.get('redirect') ?? '/';
  const isValid =
    fullName.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    password.length >= 8 &&
    whatsappNumber.replace(/\D/g, '').length >= 8 &&
    airtelNumber.replace(/\D/g, '').length >= 8;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const result = await signUpWithPassword({
      email,
      password,
      fullName,
      whatsappNumber,
      airtelNumber,
    });
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresConfirmation) {
      setSuccess(true);
      return;
    }
    router.push(redirect.startsWith('/') ? redirect : '/app');
  }

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-caption font-bold text-brand-700">
        <UserPlus size={14} />
        Inscription
      </span>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-950">Créer votre compte</h1>
      <p className="mt-2 text-body text-ink-600">
        Votre email sert à vous connecter. Vos numéros restent privés et ne seront pas affichés avant le paiement confirmé.
      </p>
      {success ? (
        <div className="mt-6 rounded-xl border border-info-200 bg-info-50 p-4 text-body text-info-800" role="status">
          Vérifiez votre boîte email pour confirmer votre compte, puis revenez vous connecter.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-body-sm font-bold text-ink-800">Nom complet</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Prénom et nom"
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-body-sm font-bold text-ink-800">Adresse email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
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
            <label htmlFor="password" className="mb-1.5 block text-body-sm font-bold text-ink-800">Mot de passe</label>
            <div className="relative">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="whatsapp" className="mb-1.5 block text-body-sm font-bold text-ink-800">WhatsApp</label>
              <input
                id="whatsapp"
                type="tel"
                autoComplete="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="+235 66 12 34 56"
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required
              />
            </div>
            <div>
              <label htmlFor="airtel" className="mb-1.5 block text-body-sm font-bold text-ink-800">Airtel Money</label>
              <input
                id="airtel"
                type="tel"
                autoComplete="tel"
                value={airtelNumber}
                onChange={(event) => setAirtelNumber(event.target.value)}
                placeholder="+235 66 12 34 56"
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-body text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
            <span>{isSubmitting ? 'Création…' : 'Créer mon compte'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-caption text-ink-600">
        Déjà un compte ?{' '}
        <Link href={`/connexion?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-brand-700 hover:underline">
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
