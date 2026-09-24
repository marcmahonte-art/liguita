'use client';

import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

export default function OtpPage() {
  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 text-center shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Authentification par email</h1>
      <p className="mt-3 text-body text-ink-600">
        La vérification par SMS n’est plus utilisée. Connectez-vous avec votre adresse email et votre mot de passe.
      </p>
      <Link href="/connexion" className={buttonClasses({ variant: 'primary', className: 'mt-6 inline-flex' })}>
        Aller à la connexion
      </Link>
    </div>
  );
}
