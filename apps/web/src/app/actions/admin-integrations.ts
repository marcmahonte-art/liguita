'use server';

import { createClient } from '../../lib/supabase/server';

/**
 * État de configuration des intégrations de paiement.
 *
 * ⚠️ **Cette action ne renvoie que des booléens, jamais une valeur de secret.**
 * L'interface a besoin de savoir si le versement automatique est armé ou non ;
 * elle n'a jamais besoin du PIN marchand ni de la clé HMAC. Renvoyer `true`
 * plutôt que la chaîne rend la fuite impossible par construction — un composant
 * client ne peut pas afficher ce qu'il n'a pas reçu.
 *
 * La lecture des variables d'environnement se fait ici, côté serveur : un
 * composant client ne voit pas `process.env.AIRTEL_TD_MERCHANT_PIN`.
 */

export interface IntegrationState {
  airtelEnvironment: 'UAT' | 'PRODUCTION' | 'NON CONFIGURÉ';
  airtelCredentials: boolean;
  airtelHmac: boolean;
  airtelMerchantMsisdn: boolean;
  airtelMerchantPin: boolean;
  moovConfigured: boolean;
  webhookSecret: boolean;
  /** Le versement automatique peut-il réellement partir ? */
  payoutReady: boolean;
  /** L'encaissement peut-il réellement aboutir ? */
  collectionReady: boolean;
  cronSecret: boolean;
}

export async function getIntegrationState(): Promise<{
  state?: IntegrationState;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Non connecté' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.app_role !== 'ADMIN' && profile?.app_role !== 'MODERATOR') {
    return { error: 'Accès réservé à l’administration.' };
  }

  const environment = process.env.LIGUITA_AIRTEL_ENV ?? process.env.AIRTEL_TD_ENV;
  const isProduction = environment === 'prod';

  const airtelCredentials = isProduction
    ? Boolean(process.env.AIRTEL_TD_PROD_CLIENT_ID && process.env.AIRTEL_TD_PROD_CLIENT_SECRET)
    : Boolean(process.env.AIRTEL_TD_UAT_CLIENT_ID && process.env.AIRTEL_TD_UAT_CLIENT_SECRET);

  const airtelHmac = Boolean(process.env.AIRTEL_TD_HMAC_PRIVATE_KEY);
  const airtelMerchantMsisdn = Boolean(process.env.AIRTEL_TD_MERCHANT_MSISDN);
  const airtelMerchantPin = Boolean(process.env.AIRTEL_TD_MERCHANT_PIN);

  return {
    state: {
      airtelEnvironment: environment
        ? isProduction
          ? 'PRODUCTION'
          : 'UAT'
        : 'NON CONFIGURÉ',
      airtelCredentials,
      airtelHmac,
      airtelMerchantMsisdn,
      airtelMerchantPin,
      moovConfigured: Boolean(
        process.env.MOOV_API_BASE_URL && process.env.MOOV_MERCHANT_ID && process.env.MOOV_API_KEY,
      ),
      webhookSecret: Boolean(process.env.PAYMENT_WEBHOOK_SECRET),
      /* ⚠️ Les deux conditions ne sont pas interchangeables :
         l'encaissement exige le numéro marchand, le versement exige le PIN.
         Airtel refuse un versement sans PIN, et un encaissement sans numéro
         aboutirait sur le mauvais destinataire. */
      collectionReady: airtelCredentials && airtelHmac && airtelMerchantMsisdn,
      payoutReady: airtelCredentials && airtelHmac && airtelMerchantMsisdn && airtelMerchantPin,
      cronSecret: Boolean(process.env.CRON_SECRET),
    },
  };
}
