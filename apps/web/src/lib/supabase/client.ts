import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase pour les composants client (`'use client'`).
 *
 * Utilise `createBrowserClient` de `@supabase/ssr` : la session est transportée
 * par les cookies Next.js et rafraîchie automatiquement.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
