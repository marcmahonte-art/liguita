import { NextResponse, type NextRequest } from 'next/server';

import { AirtelMoneyProvider } from '@liguita/payments';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

/**
 * Webhook de **versement** Airtel Money — le retrait d'un trouveur.
 *
 * ⚠️ Route distincte de `/api/airtel/callback`, et c'est délibéré.
 *
 * Les deux flux manipulent de l'argent, mais dans des sens opposés :
 *   · `/api/airtel/callback`         → un **chercheur** a payé Liguita ;
 *   · `/api/airtel/payout-callback`  → Liguita a payé un **trouveur**.
 *
 * Les fusionner obligerait à deviner le sens depuis le contenu de la charge
 * utile, et une erreur de devinette ferait passer un versement pour un
 * encaissement. Deux routes, deux tables, aucun arbitrage à l'exécution.
 *
 * Le rapprochement se fait sur `withdrawals.provider_reference`, jamais sur un
 * montant : deux retraits du même montant vers le même numéro le même jour sont
 * parfaitement possibles.
 */

interface AirtelPayoutPayload {
  transaction?: {
    id?: string;
    airtel_money_id?: string;
    status?: string;
    status_code?: string;
    message?: string;
  };
  /** Certaines notifications de versement encapsulent sous `data`. */
  data?: {
    transaction?: {
      id?: string;
      airtel_money_id?: string;
      status?: string;
      status_code?: string;
      message?: string;
    };
  };
}

function payoutTransaction(payload: AirtelPayoutPayload) {
  return payload.data?.transaction ?? payload.transaction;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let parsed: AirtelPayoutPayload;
  try {
    parsed = JSON.parse(rawBody) as AirtelPayoutPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const secret = process.env.AIRTEL_TD_HMAC_PRIVATE_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Airtel payout callback non sécurisé' }, { status: 503 });
  }

  // Un adaptateur dédié à la vérification : il n'a pas besoin d'identifiants
  // pour valider une signature, seulement du secret partagé.
  const verifier = new AirtelMoneyProvider({
    secret,
    endpoint: 'https://openapi.airtel.td',
    clientId: 'callback',
    clientSecret: 'callback',
  });
  if (!verifier.verifyWebhook(rawBody, Object.fromEntries(request.headers.entries()))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const transaction = payoutTransaction(parsed);
  const status = transaction?.status_code ?? transaction?.status ?? '';
  const providerReference = transaction?.id ?? transaction?.airtel_money_id ?? '';
  if (!status || !providerReference) {
    return NextResponse.json({ error: 'Invalid Airtel payout payload' }, { status: 400 });
  }

  const service = tryCreateServiceClient();
  if (!service) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const { data: withdrawal } = await service
    .from('withdrawals')
    .select('id, amount, status, destination_msisdn')
    .eq('provider', 'AIRTEL')
    .eq('provider_reference', providerReference)
    .maybeSingle();

  if (!withdrawal) {
    // On répond 404 pour que l'opérateur rejoue : une référence inconnue peut
    // simplement signaler que l'écriture locale n'est pas encore visible.
    return NextResponse.json({ error: 'Retrait introuvable' }, { status: 404 });
  }

  if (status === 'TS') {
    const { data, error } = await service.rpc('admin_mark_withdrawal_paid', {
      p_withdrawal_id: withdrawal.id,
      p_provider_reference: providerReference,
      p_note: 'Confirmé par le webhook Airtel',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, result: data });
  }

  if (status === 'TF' || status === 'TE') {
    const reason =
      transaction?.message ?? 'Airtel a refusé le versement (notification opérateur)';
    const { data, error } = await service.rpc('admin_release_withdrawal_hold', {
      p_withdrawal_id: withdrawal.id,
      p_reason: reason,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, result: data, released: true });
  }

  // TA / TIP : versement soumis, la confirmation viendra. On enregistre la
  // tentative sans toucher au solde — l'argent est déjà bloqué (HELD).
  const { data, error } = await service.rpc('admin_record_payout_attempt', {
    p_withdrawal_id: withdrawal.id,
    p_provider_reference: providerReference,
    p_provider_status: 'PENDING',
    p_request_payload: null,
    p_response_payload: parsed as unknown as Record<string, unknown>,
    p_error: null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, result: data, pending: true });
}

/**
 * Airtel envoie parfois un `GET` de contrôle d'URL lors de la déclaration du
 * point de notification, avant tout trafic réel. Répondre 200 évite que le
 * compte marchand soit marqué comme injoignable.
 */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'airtel-payout-callback' });
}
