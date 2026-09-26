'use client';

import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

/**
 * Page de compatibilité — l'authentification par SMS n'existe pas.
 *
 * ⚠️ Elle reste en ligne parce que des liens circulated vers `/otp`, et qu'une 404 sur
 * une URL déjà partagée est plus inexplicable qu'un message clair. Elle fait le tour
 * par `/connexion`, qui propose désormais Google en plus de l'email.
 */
export default function OtpPage() {
  return (
    <div className="rounded-3xl border border-ink-200 bg-white p-6 text-center shadow-card sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-ink-950">
        Connexion par SMS indisponible
      </h1>
      <p className="mt-3 text-body text-ink-600">
        La vérification par SMS n’est pas utilisée. Connectez-vous avec votre compte Google,
        ou avec votre adresse email et votre mot de passe.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/connexion"
          className={buttonClasses({ variant: 'primary', className: 'inline-flex' })}
        >
          Se connecter
        </Link>
        <Link
          href="/inscription"
          className={buttonClasses({ variant: 'outline', className: 'inline-flex' })}
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
