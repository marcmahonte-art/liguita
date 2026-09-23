import type { ReactNode } from 'react';

import Link from 'next/link';

import { Logo } from '../../components/brand/Logo';

/**
 * Coquille des pages d'authentification.
 *
 * Volontairement dépouillée : ni header marketing, ni footer. L'utilisateur est dans
 * un tunnel court (téléphone → OTP) et chaque lien sortant serait une source de distraction.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50/60 px-4 py-10">
      <Link href="/" aria-label="Liguita — retour à l’accueil" className="rounded-lg">
        <Logo priority />
      </Link>

      <main className="mt-8 w-full max-w-md">{children}</main>
    </div>
  );
}
