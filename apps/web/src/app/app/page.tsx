import { redirect } from 'next/navigation';

/**
 * `/app` — redirection serveur vers les correspondances.
 * (Le middleware a déjà vérifié la session.)
 */
export default function AppRoot() {
  redirect('/app/correspondances');
}
