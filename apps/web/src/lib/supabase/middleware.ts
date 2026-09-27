import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirectPath } from '../auth/redirect';

/**
 * Rafraîchit la session Supabase à chaque requête (middleware Next.js).
 *
 * Retourne la réponse Next mise à jour avec les cookies de session rafraîchis.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ⚠️ N'exécuter AUCUNE logique entre createServerClient et getUser() :
  // un simple await peut laisser des cookies non propagés.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Routes protégées : session obligatoire. `/declarer/*` utilise un gate côté page
  // (redirection avec paramètre `redirect` plus précis).
  const PROTECTED_PREFIXES = ['/app', '/business', '/admin'];

  // Fiche de consentement — hors de `/app`, donc non couverte par les préfixes
  // protégés ci-dessus : la garde ci-dessous ne peut pas boucler sur elle-même.
  const CONSENT_PATH = '/consentement';

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Consentement obligatoire : un utilisateur connecté qui n'a pas signé la
  // fiche ne peut pas entrer dans l'application. On interroge la fonction SQL
  // `registration_consent_state()` (source de vérité unique, cf. migration
  // 20260923003500).
  //
  // ⚠️ On n'échoue jamais la requête si la fonction n'existe pas encore
  // (migration en attente) : on laisse passer plutôt que d'enfermer tout le
  // monde hors de l'application. Le garde de page (`/app/layout`) reprend le
  // relais dès que la base est à jour.
  if (user && isProtected && !pathname.startsWith(CONSENT_PATH)) {
    const { data: consentState } = await supabase.rpc('registration_consent_state');
    const state = consentState as
      | { contact_disclosure?: boolean; terms?: boolean }
      | null
      | undefined;

    // `undefined` = fonction absente (PGRST202) → on ne bloque pas.
    // `null` ou objet = la fonction a répondu, on l'applique.
    if (state && !(state.contact_disclosure && state.terms)) {
      const url = request.nextUrl.clone();
      url.pathname = CONSENT_PATH;
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  // L'utilisateur connecté n'a pas besoin de la page de connexion.
  if (user && (pathname === '/connexion' || pathname === '/inscription')) {
    const url = request.nextUrl.clone();
    // ⚠️ Même garde que la page de connexion et que le rappel OAuth. Un simple
    // `startsWith('/')` laisserait passer `//evil.example`, que le navigateur lit
    // comme une URL absolue : depuis la page de connexion, la redirection ouverte
    // partirait d'un site de restitution d'objets perdus.
    url.pathname = safeRedirectPath(request.nextUrl.searchParams.get('redirect'), '/');
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
