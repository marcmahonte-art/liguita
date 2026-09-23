import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase **service_role** côté serveur uniquement.
 *
 * Réservé aux opérations qui doivent traverser la RLS sans session utilisateur :
 * · matching après une déclaration (lecture croisée lost ↔ found)
 * · workers cron (`match-sweep`, `saved-search-alerts`)
 * · détail d'une correspondance (les deux côtés, après contrôle d'accès)
 *
 * ⚠️ Jamais importé depuis un composant client — la clé ne doit pas figurer
 * dans le bundle navigateur. Variable d'env `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante — impossible de créer le client service.',
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Comme `createServiceClient`, mais `null` si la clé n'est pas configurée (dev partiel). */
export function tryCreateServiceClient(): SupabaseClient | null {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}
