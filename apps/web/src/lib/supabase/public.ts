import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase anonyme SANS cookies — réservé aux Server Components
 * statiques / ISR (`revalidate`) où `cookies()` forcerait un rendu dynamique.
 *
 * N'utilise que `NEXT_PUBLIC_*` (clé anon). Jamais de service_role ici.
 */
export function createPublicSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
