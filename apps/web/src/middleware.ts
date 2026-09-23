import { type NextRequest } from 'next/server';

import { updateSession } from './lib/supabase/middleware';

/**
 * Middleware global Next.js.
 *
 * Responsabilités :
 *  1. Rafraîchir le token de session Supabase à chaque requête ;
 *  2. Protéger les routes `/app/*`, `/business/*`, `/admin/*` (redirection `/connexion`) ;
 *  3. Laisser passer librement les routes publiques.
 *
 * La logique de garde vit dans `lib/supabase/middleware.ts` pour rester testable.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf assets statiques et fichiers (images, fonts, favicon).
     */
    '/((?!_next/static|_next/image|favicon\\.png|logo-.*|hero-person|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
