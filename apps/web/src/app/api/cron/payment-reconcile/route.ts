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
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return null;
  if (code === 'CASH') return new TestPaymentProvider(secret);
  if (code === 'AIRTEL') {
    return new AirtelMoneyProvider({
      secret,
      endpoint: process.env.AIRTEL_API_BASE_URL ?? '',
      clientId: process.env.AIRTEL_CLIENT_ID ?? '',
      clientSecret: process.env.AIRTEL_CLIENT_SECRET ?? '',
      merchantCode: process.env.AIRTEL_MERCHANT_CODE ?? '',
    });
  }
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
    .select('id, provider, provider_reference, amount, currency, status')
    .in('status', ['INITIATED', 'PENDING'])
    .not('provider_reference', 'is', null)
    .order('created_at', { ascending: true })
    .limit(50);

  let paid = 0;
  let failed = 0;
  for (const transaction of transactions ?? []) {
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
