'use client';

import { CheckCircle2, ChevronLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { OTPInput, buttonClasses } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';

const OTP_LENGTH = 6;
const RESEND_DELAY_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp, signInWithPhone, isLoading: authLoading } = useAuth();

  const phone = searchParams.get('phone') ?? '';
  const redirect = searchParams.get('redirect') ?? '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isComplete = code.replace(/\s/g, '').length === OTP_LENGTH;
  const isLocked = attempts >= MAX_ATTEMPTS;

  const startTimer = useCallback(() => {
    setSecondsLeft(RESEND_DELAY_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!isComplete || isSubmitting || isLocked || !phone) return;

    setError(null);
    setIsSubmitting(true);

    const { error: verifyError } = await verifyOtp(phone, code.replace(/\s/g, ''));

    setIsSubmitting(false);

    if (verifyError) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setError(
        nextAttempts >= MAX_ATTEMPTS
          ? 'Trop de tentatives. Demandez un nouveau code.'
          : `Code incorrect. Tentative ${nextAttempts}/${MAX_ATTEMPTS}.`,
      );
      return;
    }

    const target = redirect && redirect.startsWith('/') ? redirect : '/';
    router.push(target);
  }

  async function handleResend() {
    if (secondsLeft > 0 || !phone) return;
    setError(null);
    const { error: resendError } = await signInWithPhone(phone);
    if (resendError) {
      setError(resendError);
      return;
    }
    setAttempts(0);
    setCode('');
    startTimer();
  }

  if (!phone) {
    return (
      <div className="rounded-3xl border border-ink-200 bg-white p-6 text-center shadow-card sm:p-8">
        <p className="text-body text-ink-600">Numéro manquant.</p>
        <Link
          href="/connexion"
          className={buttonClasses({ variant: 'primary', className: 'mt-4 inline-flex' })}
        >
          Recommencer
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <Link
        href={`/connexion?redirect=${encodeURIComponent(redirect)}`}
        className="inline-flex min-h-[48px] items-center gap-1 text-caption font-bold text-ink-600 hover:text-ink-900"
      >
        <ChevronLeft size={16} />
        Changer de numéro
      </Link>

      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink-950">
        Entrez le code
      </h1>
      <p className="mt-2 text-body text-ink-600">
        Un code à {OTP_LENGTH} chiffres a été envoyé au{' '}
        <strong className="font-display text-ink-900">+235 {phone}</strong>.
      </p>

      <form onSubmit={handleVerify} className="mt-6 space-y-5">
        <OTPInput
          length={OTP_LENGTH}
          value={code}
          onValueChange={(value) => {
            setCode(value);
            if (error) setError(null);
          }}
          label="Code de vérification"
          error={error ?? undefined}
          disabled={isSubmitting || isLocked || authLoading}
          autoFocus
        />

        <button
          type="submit"
          disabled={!isComplete || isSubmitting || isLocked || authLoading}
          className={buttonClasses({
            variant: 'primary',
            block: true,
            size: 'lg',
            className: !isComplete || isSubmitting || isLocked ? 'opacity-50 cursor-not-allowed' : '',
          })}
        >
          <span>{isSubmitting ? 'Vérification…' : 'Vérifier'}</span>
          <CheckCircle2 size={18} />
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
        <span className="text-caption text-ink-500">
          {attempts > 0 && !isLocked && `Tentatives : ${attempts}/${MAX_ATTEMPTS}`}
          {isLocked && 'Verrouillé — demandez un nouveau code'}
        </span>

        <button
          type="button"
          onClick={handleResend}
          disabled={secondsLeft > 0}
          className={buttonClasses({
            variant: 'ghost',
            size: 'sm',
            className: secondsLeft > 0 ? 'opacity-50 cursor-not-allowed' : '',
          })}
        >
          <RefreshCw size={14} />
          <span>{secondsLeft > 0 ? `Renvoyer dans ${secondsLeft}s` : 'Renvoyer le code'}</span>
        </button>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
