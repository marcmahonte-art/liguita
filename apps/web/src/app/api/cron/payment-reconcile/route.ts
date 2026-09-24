import { NextResponse, type NextRequest } from 'next/server';

import {
  AirtelMoneyProvider,
  MoovMoneyProvider,
  TestPaymentProvider,
  type PaymentProvider,
} from '@liguita/payments';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function providerFor(code: string): PaymentProvider | null {
  if (code === 'AIRTEL') {
    const environment = process.env.AIRTEL_TD_ENV === 'prod' ? 'PROD' : 'UAT';
    const endpoint =
      process.env.AIRTEL_TD_BASE_URL ??
      (environment === 'PROD'
        ? process.env.AIRTEL_TD_PROD_BASE_URL
        : process.env.AIRTEL_TD_UAT_BASE_URL) ??
      process.env.AIRTEL_API_BASE_URL ??
      '';
    return new AirtelMoneyProvider({
      secret: process.env.AIRTEL_TD_HMAC_PRIVATE_KEY ?? '',
      endpoint,
      clientId: process.env.AIRTEL_TD_CLIENT_ID ?? process.env.AIRTEL_CLIENT_ID ?? '',
      clientSecret: process.env.AIRTEL_TD_CLIENT_SECRET ?? process.env.AIRTEL_CLIENT_SECRET ?? '',
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

export async function GET(request: NextRequest) {
  if (!(await authorize(request)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = tryCreateServiceClient();
  if (!service)
    return NextResponse.json({ ok: false, error: 'Service indisponible' }, { status: 500 });

  const { data: transactions } = await service
    .from('transactions')
    .select('id, provider, provider_reference, amount, currency, status, initiated_at')
    .in('status', ['INITIATED', 'PENDING'])
    .not('provider_reference', 'is', null)
    .order('created_at', { ascending: true })
    .limit(50);

  let paid = 0;
  let failed = 0;
  for (const transaction of transactions ?? []) {
    if (
      transaction.provider === 'AIRTEL' &&
      new Date(transaction.initiated_at).getTime() > Date.now() - 180_000
    ) {
      continue;
    }
    const provider = providerFor(transaction.provider);
    if (!provider) continue;
    try {
      const result = await provider.checkStatus(transaction.provider_reference as string);
      if (result.status === 'PAID') {
        const { data } = await service.rpc('mark_payment_paid', {
          p_transaction_id: transaction.id,
          p_provider_reference: transaction.provider_reference,
          p_payload: { source: 'payment-reconcile', status: result.status },
          p_event_id: `reconcile_${transaction.id}_${transaction.provider_reference}`,
        });
        if (data) paid += 1;
      } else if (result.status === 'FAILED' || result.status === 'CANCELLED') {
        await service
          .from('transactions')
          .update({
            status: result.status,
            failure_reason: result.failureReason ?? 'Rapprochement opérateur',
          })
          .eq('id', transaction.id);
        failed += 1;
      }
    } catch {
      continue;
    }
  }
  return NextResponse.json({
    ok: true,
    processed: transactions?.length ?? 0,
    paid,
    failed,
    at: new Date().toISOString(),
  });
}
