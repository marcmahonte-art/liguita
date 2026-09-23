import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

export const metadata = { title: 'Hors connexion' };

export default function OfflinePage() {
  return <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center"><h1 className="font-display text-3xl font-extrabold text-ink-950">Vous êtes hors connexion</h1><p className="text-body text-ink-600">La page demandée n’est pas disponible sans réseau. Reconnectez-vous puis réessayez.</p><Link href="/" className={buttonClasses({ variant: 'primary' })}>Retour à l’accueil</Link></div>;
}
