'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { CONSENT_VERSION } from '@liguita/config';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';

/**
 * ⚠️ Un fichier `'use server'` ne peut exporter que des fonctions asynchrones :
 * `CONSENT_VERSION` vit donc dans `@liguita/config` (module `consents.ts`),
 * avec les autres constantes partagées.
 */

export interface ConsentKindInput {
  readonly contactDisclosure: boolean;
  readonly terms: boolean;
}

export interface ConsentResult {
  ok: boolean;
  error?: string;
}

/**
 * Enregistre les consentements donnés à l'inscription.
 *
 * Les deux consentements sont **obligatoires** : sans divulgation du contact,
 * le chercheur paierait sans jamais pouvoir joindre le trouveur ; sans les
 * conditions, l'utilisation du service n'a pas de cadre.
 *
 * ⚠️ L'horodatage et l'adresse IP sont écrits **côté serveur** : une valeur
 * fournie par le client n'aurait aucune valeur probante.
 */
export async function recordRegistrationConsents(input: ConsentKindInput): Promise<ConsentResult> {
  if (!input.contactDisclosure || !input.terms) {
    return {
      ok: false,
      error:
        'Les deux consentements sont obligatoires pour utiliser Liguita. ' +
        'Vous pouvez fermer votre compte à tout moment depuis vos paramètres.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée. Reconnectez-vous.' };

  const headerList = await headers();
  // `x-forwarded-for` peut contenir une chaîne `client, proxy1, proxy2` :
  // on ne garde que la première adresse, celle du client.
  const forwarded = headerList.get('x-forwarded-for') ?? '';
  const ipAddress = forwarded.split(',')[0]?.trim() || headerList.get('x-real-ip') || null;
  const userAgent = headerList.get('user-agent')?.slice(0, 500) ?? null;

  const rows = [
    { user_id: user.id, kind: 'CONTACT_DISCLOSURE', version: CONSENT_VERSION },
    { user_id: user.id, kind: 'TERMS', version: CONSENT_VERSION },
  ].map((row) => ({ ...row, ip_address: ipAddress, user_agent: userAgent }));

  // Upsert : si l'utilisateur revient sur la page (rechargement, double clic),
  // on ne crée pas de doublon — l'index unique porte sur (user_id, kind, version).
  const { error } = await supabase
    .from('consents')
    .upsert(rows, { onConflict: 'user_id,kind,version', ignoreDuplicates: true });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/app');
  return { ok: true };
}

export interface ConsentState {
  readonly requiredVersion: string;
  readonly contactDisclosure: boolean;
  readonly terms: boolean;
  readonly complete: boolean;
}

/**
 * État des consentements de l'utilisateur connecté.
 *
 * S'appuie sur la fonction SQL `registration_consent_state()` : une seule
 * source de vérité, pour que le garde de page et la base ne divergent jamais.
 */
export async function getConsentState(): Promise<ConsentState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('registration_consent_state');
  if (error || !data) {
    // La fonction SQL n'est pas encore déployée (migration 01700 en attente) :
    // on dégrade en lecture directe plutôt que de bloquer l'utilisateur.
    const { data: rows } = await supabase
      .from('consents')
      .select('kind, version')
      .eq('user_id', user.id)
      .is('revoked_at', null);
    const contactDisclosure = Boolean(
      rows?.some((r) => r.kind === 'CONTACT_DISCLOSURE' && r.version === CONSENT_VERSION),
    );
    const terms = Boolean(rows?.some((r) => r.kind === 'TERMS' && r.version === CONSENT_VERSION));
    return {
      requiredVersion: CONSENT_VERSION,
      contactDisclosure,
      terms,
      complete: contactDisclosure && terms,
    };
  }

  const state = data as {
    required_version: string;
    contact_disclosure: boolean;
    terms: boolean;
  };
  return {
    requiredVersion: state.required_version,
    contactDisclosure: state.contact_disclosure,
    terms: state.terms,
    complete: state.contact_disclosure && state.terms,
  };
}

/** Révoque le consentement de divulgation (droit de retrait). */
export async function revokeContactDisclosure(): Promise<ConsentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Session expirée.' };

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible' };

  const { error } = await service
    .from('consents')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('kind', 'CONTACT_DISCLOSURE')
    .is('revoked_at', null);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/app/profil');
  return { ok: true };
}
