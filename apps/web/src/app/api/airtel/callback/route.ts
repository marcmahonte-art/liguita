import { NextResponse, type NextRequest } from 'next/server';

import { AirtelMoneyProvider } from '@liguita/payments';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

interface AirtelCallbackPayload {
  transaction?: {
    id?: string;
    airtel_money_id?: string;
    status?: string;
    status_code?: string;
    message?: string;
  };
}

function callbackStatus(payload: AirtelCallbackPayload): string {
  return payload.transaction?.status_code ?? payload.transaction?.status ?? '';
}

function callbackReference(payload: AirtelCallbackPayload): string {
  return payload.transaction?.id ?? '';
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let parsed: AirtelCallbackPayload;
  try {
    parsed = JSON.parse(rawBody) as AirtelCallbackPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const secret = process.env.AIRTEL_TD_HMAC_PRIVATE_KEY;
  if (process.env.NODE_ENV === 'production' && !secret) {
    return NextResponse.json({ error: 'Airtel callback non sécurisé' }, { status: 503 });
  }
  if (secret) {
    const provider = new AirtelMoneyProvider({
      secret,
      endpoint: 'https://openapi.airtel.td',
      clientId: 'callback',
      clientSecret: 'callback',
    });
    if (!provider.verifyWebhook(rawBody, Object.fromEntries(request.headers.entries()))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const status = callbackStatus(parsed);
  const providerReference = callbackReference(parsed);
  const airtelMoneyId = parsed.transaction?.airtel_money_id;
  if (!status || (!providerReference && !airtelMoneyId)) {
    return NextResponse.json({ error: 'Invalid Airtel payload' }, { status: 400 });
  }

  const service = tryCreateServiceClient();
  if (!service) return NextResponse.json({ error: 'Service indisponible' }, { status: 503 });

  const transactionResult = providerReference
    ? await service
        .from('transactions')
        .select('id, amount, currency, status')
        .eq('provider', 'AIRTEL')
        .eq('provider_reference', providerReference)
        .maybeSingle()
    : { data: null, error: null };
  const transaction =
    transactionResult.data ??
    (airtelMoneyId
      ? (
          await service
            .from('transactions')
            .select('id, amount, currency, status')
            .eq('provider', 'AIRTEL')
            .eq('airtel_money_id', airtelMoneyId)
            .maybeSingle()
        ).data
      : null);
  if (!transaction) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });

  if (status === 'TS') {
    const { data, error } = await service.rpc('mark_payment_paid', {
      p_transaction_id: transaction.id,
      p_provider_reference: providerReference || airtelMoneyId,
      p_payload: parsed,
      p_event_id: `airtel_${providerReference || airtelMoneyId}_${status}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    await service
      .from('transactions')
      .update({
        airtel_money_id: airtelMoneyId,
        airtel_status: status,
        airtel_response_code: status,
        callback_received_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);
    return NextResponse.json({ ok: true, result: data });
  }

  await service
    .from('transactions')
    .update({
      status: status === 'TF' ? 'FAILED' : status === 'TE' ? 'CANCELLED' : 'PENDING',
      failure_reason: parsed.transaction?.message ?? `Airtel ${status}`,
      airtel_money_id: airtelMoneyId,
      airtel_status: status,
      airtel_response_code: status,
      callback_received_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);
  return NextResponse.json({ ok: true, ignored: true });
}
