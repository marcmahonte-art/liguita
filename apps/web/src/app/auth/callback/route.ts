import { NextResponse } from 'next/server';

import { safeRedirectPath } from '../../../lib/auth/redirect';
import { createClient } from '../../../lib/supabase/server';

/**
 * Retour de « Continuer avec Google ».
 *
 * Supabase renvoie l'utilisateur ici avec un `code` d'autorisation. L'échange se fait
 * côté serveur : le code n'est jamais exposé au navigateur, et les cookies de session
 * sont posés sur la réponse qui continue la navigation — c'est la seule façon d'obtenir
 * une session persistante avec `@supabase/ssr`.
 *
 * ⚠️ Rien de technique n'est renvoyé à l'utilisateur : un échec OAuth part vers
 * `/connexion?erreur=…` avec un **code** parmi une liste fermée, que la page traduit
 * en une phrase. Le message d'erreur brut du fournisseur peut contenir des URL, des
 * identifiants de configuration et des noms de tables ; il n'a rien à faire dans une
 * page de connexion.
 *
 * Le même point d'entrée sert Google et, demain, toute autre méthode externe : rien
 * ici n'est propre à un fournisseur.
 */

/** Codes d'erreur exposés à l'interface. La réponse reste volontairement banale. */
const AUTH_ERRORS = new Set([
  'oauth_exchange_failed',
  'oauth_missing_code',
  'oauth_denied',
]);

function failure(origin: string, code: string, next: string): NextResponse {
  const safeCode = AUTH_ERRORS.has(code) ? code : 'oauth_exchange_failed';
  const target = new URL('/connexion', origin);
  target.searchParams.set('erreur', safeCode);
  target.searchParams.set('redirect', next);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeRedirectPath(searchParams.get('redirect'));
  const code = searchParams.get('code');
  const providerError = searchParams.get('error');

  if (providerError) {
    return failure(origin, 'oauth_denied', next);
  }
  if (!code) {
    return failure(origin, 'oauth_missing_code', next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    /* Le message d'erreur du fournisseur peut nommer des tables, des clés ou des
       URL internes : il n'est ni journalisé ni renvoyé ici. Un seul code, une seule
       conséquence pour l'utilisateur — réessayer, ou passer par email. */
    return failure(origin, 'oauth_exchange_failed', next);
  }

  return NextResponse.redirect(new URL(next, origin));
}
