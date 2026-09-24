import { NextResponse, type NextRequest } from 'next/server';

import {
  AirtelMoneyProvider,
  MoovMoneyProvider,
  TestPaymentProvider,
  type PaymentProvider,
} from '@liguita/payments';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

interface PaymentWebhookPayload {
  eventId: string;
  providerReference: string;
  status: 'PAID' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
}

function providerFor(code: string): PaymentProvider | null {
  if (code === 'AIRTEL') {
    const isProduction = (process.env.LIGUITA_AIRTEL_ENV ?? process.env.AIRTEL_TD_ENV) === 'prod';
    const endpoint =
      process.env.AIRTEL_BASE_URL ??
      process.env.AIRTEL_TD_BASE_URL ??
      (isProduction ? process.env.AIRTEL_TD_PROD_BASE_URL : process.env.AIRTEL_TD_UAT_BASE_URL) ??
      process.env.AIRTEL_API_BASE_URL ??
      '';
    const clientId = isProduction
      ? process.env.AIRTEL_TD_PROD_CLIENT_ID ?? process.env.AIRTEL_TD_CLIENT_ID
      : process.env.AIRTEL_TD_UAT_CLIENT_ID ?? process.env.AIRTEL_TD_CLIENT_ID;
    const clientSecret = isProduction
      ? process.env.AIRTEL_TD_PROD_CLIENT_SECRET ?? process.env.AIRTEL_TD_CLIENT_SECRET
      : process.env.AIRTEL_TD_UAT_CLIENT_SECRET ?? process.env.AIRTEL_TD_CLIENT_SECRET;
    return new AirtelMoneyProvider({
      secret: process.env.AIRTEL_TD_HMAC_PRIVATE_KEY ?? '',
      endpoint,
      clientId: clientId ?? process.env.AIRTEL_CLIENT_ID ?? '',
      clientSecret: clientSecret ?? process.env.AIRTEL_CLIENT_SECRET ?? '',
      merchantCode: process.env.AIRTEL_MERCHANT_CODE,
    });
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return null;
  if (code === 'CASH') return new TestPaymentProvider(secret);
  if (code === 'MOOV') {
    return new MoovMoneyProvider({
      secret,
      endpoint: process.env.MOOV_API_BASE_URL ?? '',
      merchantId: process.env.MOOV_MERCHANT_ID ?? '',
      apiKey: process.env.MOOV_API_KEY ?? '',
    });
  }
  return null;
}

function parsePayload(value: unknown): PaymentWebhookPayload | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.eventId !== 'string' ||
    typeof payload.providerReference !== 'string' ||
    typeof payload.amount !== 'number' ||
    typeof payload.currency !== 'string' ||
    (payload.status !== 'PAID' && payload.status !== 'FAILED' && payload.status !== 'CANCELLED')
  )
    return null;
  return payload as unknown as PaymentWebhookPayload;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const payload = parsePayload(parsed);
  if (!payload) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const service = tryCreateServiceClient();
  if (!service) return NextResponse.json({ error: 'Service indisponible' }, { status: 500 });
  const { data: transaction } = await service
    .from('transactions')
    .select('id, provider, provider_reference, amount, currency, status')
    .eq('provider_reference', payload.providerReference)
    .maybeSingle();
  if (!transaction) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
  const provider = providerFor(transaction.provider);
  if (
    !provider ||
    !provider.verifyWebhook(rawBody, Object.fromEntries(request.headers.entries()))
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const matchedTransaction = transaction;
  if (!matchedTransaction)
    return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
  if (
    matchedTransaction.amount !== payload.amount ||
    matchedTransaction.currency !== payload.currency
  ) {
    return NextResponse.json({ error: 'Montant ou devise incohérent' }, { status: 422 });
  }
  if (matchedTransaction.status === 'PAID') {
    return NextResponse.json({ ok: true, ignored: true, final: true });
  }
  if (payload.status !== 'PAID') {
    if (payload.status === 'FAILED' || payload.status === 'CANCELLED') {
      await service
        .from('transactions')
        .update({ status: payload.status, failure_reason: 'Webhook opérateur' })
        .eq('id', matchedTransaction.id);
    }
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data, error } = await service.rpc('mark_payment_paid', {
    p_transaction_id: matchedTransaction.id,
    p_provider_reference: payload.providerReference,
    p_payload: parsed,
    p_event_id: payload.eventId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, result: data });
}
