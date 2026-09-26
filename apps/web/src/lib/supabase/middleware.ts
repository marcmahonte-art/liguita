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

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
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
