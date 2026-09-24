'use server';

import { revalidatePath } from 'next/cache';

import { computeFee, type FeeBreakdown, type PricingOptionCode } from '@liguita/core/pricing';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { toCategoryRef, toPricingRule, type PricingRuleRow } from '../../lib/pricing';
import {
  AirtelMoneyProvider,
  MoovMoneyProvider,
  TestPaymentProvider,
  type PaymentProvider,
} from '@liguita/payments';

export interface PriceQuoteView {
  id: string;
  publicRef: string;
  matchId: string;
  pricingClass: string;
  totalAmount: number;
  rewardAmount: number;
  currency: string;
  breakdown: FeeBreakdown;
  expiresAt: string;
  status: string;
}

export interface PaymentStartResult {
  ok: boolean;
  transactionId?: string;
  conversationId?: string;
  status?: string;
  redirectUrl?: string;
  error?: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseOptions(options: readonly string[]): PricingOptionCode[] {
  const allowed = new Set<PricingOptionCode>(['URGENT', 'CONCIERGERIE', 'DELIVERY']);
  const parsed = [...new Set(options)];
  if (parsed.some((option) => !allowed.has(option as PricingOptionCode))) {
    throw new Error('Option de paiement invalide.');
  }
  return parsed as PricingOptionCode[];
}

function toQuoteView(row: Record<string, unknown>): PriceQuoteView {
  return {
    id: String(row.id),
    publicRef: String(row.public_ref),
    matchId: String(row.match_id),
    pricingClass: String(row.pricing_class),
    totalAmount: Number(row.total_amount),
    rewardAmount: Number(row.reward_amount),
    currency: String(row.currency),
    breakdown: row.breakdown as FeeBreakdown,
    expiresAt: String(row.expires_at),
    status: String(row.status),
  };
}

async function loadQuoteContext(
  service: NonNullable<ReturnType<typeof tryCreateServiceClient>>,
  userId: string,
  matchId: string,
) {
  const [{ data: match }, { data: claims }] = await Promise.all([
    service
      .from('matches')
      .select('id, lost_item_id, found_item_id, status')
      .eq('id', matchId)
      .maybeSingle(),
    service
      .from('claims')
      .select('id, status')
      .eq('match_id', matchId)
      .eq('claimant_id', userId)
      .eq('status', 'APPROVED')
      .maybeSingle(),
  ]);
  if (!match || match.status !== 'CLAIMED' || !claims)
    throw new Error('La propriété de cet objet doit être approuvée.');

  const [{ data: lost }, { data: found }] = await Promise.all([
    service
      .from('lost_items')
      .select('user_id, category_code, declared_value_xaf')
      .eq('id', match.lost_item_id)
      .maybeSingle(),
    service.from('found_items').select('finder_id').eq('id', match.found_item_id).maybeSingle(),
  ]);
  if (!lost || lost.user_id !== userId || !found)
    throw new Error('Cette correspondance ne vous appartient pas.');

  const { data: category } = await service
    .from('item_categories')
    .select('id, default_class, max_value_xaf')
    .eq('code', lost.category_code)
    .maybeSingle();
  if (!category) throw new Error('Catégorie introuvable.');

  const { data: rule } = await service
    .from('pricing_rules')
    .select('*')
    .eq('country_code', 'TD')
    .eq('is_active', true)
    .maybeSingle();
  if (!rule) throw new Error('Aucune grille tarifaire active.');

  return {
    match,
    claim: claims,
    category: toCategoryRef(category),
    declaredValueXaf: lost.declared_value_xaf === null ? null : Number(lost.declared_value_xaf),
    rule: toPricingRule(rule as PricingRuleRow),
  };
}

export async function createPriceQuote(
  matchId: string,
  requestedOptions: readonly string[] = [],
  communityBonusXaf = 0,
  replaceQuoteId?: string,
): Promise<{ quote: PriceQuoteView | null; error?: string }> {
  const { user } = await requireUser();
  if (!user) return { quote: null, error: 'Non connecté' };
  const service = tryCreateServiceClient();
  if (!service) return { quote: null, error: 'Service indisponible.' };

  try {
    const options = parseOptions(requestedOptions);
    const bonus = Math.max(0, Math.trunc(communityBonusXaf));
    const context = await loadQuoteContext(service, user.id, matchId);
    if (options.includes('DELIVERY') && context.rule.deliveryIsProxy) {
      return {
        quote: null,
        error: 'La livraison sera disponible après validation du tarif partenaire.',
      };
    }
    const breakdown = computeFee({
      rule: context.rule,
      category: context.category,
      declaredValueXaf: context.declaredValueXaf,
      options,
      communityBonusXaf: bonus,
    });
    if (replaceQuoteId) {
      await service
        .from('price_quotes')
        .update({ status: 'VOID' })
        .eq('id', replaceQuoteId)
        .eq('payer_id', user.id)
        .eq('status', 'OPEN');
    }
    const { data, error } = await service
      .from('price_quotes')
      .insert({
        claim_id: context.claim.id,
        match_id: matchId,
        payer_id: user.id,
        pricing_rule_id: context.rule.id,
        pricing_rule_version: context.rule.version,
        pricing_class: breakdown.pricingClass,
        declared_value_xaf: context.declaredValueXaf,
        base_fee: breakdown.baseFee,
        urgent_fee: breakdown.urgentFee,
        conciergerie_fee: breakdown.conciergerieFee,
        delivery_fee: breakdown.deliveryFee,
        community_bonus: breakdown.communityBonus,
        total_amount: breakdown.totalAmount,
        currency: breakdown.currency,
        reward_amount: breakdown.rewardAmount,
        liguita_commission: breakdown.liguitaCommission,
        delivery_payout: breakdown.deliveryPayout,
        vat_amount: breakdown.vatAmount,
        options,
        breakdown,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single();
    if (error || !data)
      return { quote: null, error: error?.message ?? 'Création du devis impossible.' };
    revalidatePath(`/app/correspondances/${matchId}/paiement`);
    return { quote: toQuoteView(data) };
  } catch (error) {
    return { quote: null, error: error instanceof Error ? error.message : 'Devis impossible.' };
  }
}

export async function getPaymentState(matchId: string): Promise<{
  status: 'UNPAID' | 'PENDING' | 'PAID' | 'REFUNDED';
  conversationId: string | null;
  transactionId: string | null;
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user)
    return { status: 'UNPAID', conversationId: null, transactionId: null, error: 'Non connecté' };
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, status')
    .eq('match_id', matchId)
    .in('status', ['INITIATED', 'PENDING', 'PAID', 'REFUNDED'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!transaction) return { status: 'UNPAID', conversationId: null, transactionId: null };
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle();
  return {
    status:
      transaction.status === 'PAID'
        ? 'PAID'
        : transaction.status === 'REFUNDED'
          ? 'REFUNDED'
          : 'PENDING',
    conversationId: conversation?.id ?? null,
    transactionId: transaction.id,
  };
}

function providerFor(code: 'CASH' | 'AIRTEL' | 'MOOV'): PaymentProvider {
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
  if (!secret) throw new Error('Secret de paiement non configuré.');
  if (code === 'CASH') return new TestPaymentProvider(secret);
  return new MoovMoneyProvider({
    secret,
    endpoint: process.env.MOOV_API_BASE_URL ?? '',
    merchantId: process.env.MOOV_MERCHANT_ID ?? '',
    apiKey: process.env.MOOV_API_KEY ?? '',
  });
}

export async function initiatePayment(
  quoteId: string,
  idempotencyKey: string,
  providerCode: 'CASH' | 'AIRTEL' | 'MOOV' = 'CASH',
): Promise<PaymentStartResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  if (process.env.PAYMENT_CASH_ENABLED !== 'true' && providerCode === 'CASH') {
    return { ok: false, error: 'Le paiement espèces n’est pas activé.' };
  }
  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { data: transactionId, error } = await supabase.rpc('create_payment_transaction', {
    p_quote_id: quoteId,
    p_idempotency_key: idempotencyKey,
    p_provider: providerCode,
  });
  if (error || !transactionId)
    return { ok: false, error: error?.message ?? 'Initialisation impossible.' };

  const { data: existingTransaction } = await service
    .from('transactions')
    .select('provider_reference, provider_request_started_at, status')
    .eq('id', transactionId)
    .maybeSingle();
  if (
    existingTransaction?.provider_reference ||
    existingTransaction?.provider_request_started_at ||
    existingTransaction?.status === 'PAID'
  ) {
    return {
      ok: true,
      transactionId,
      status: existingTransaction.status === 'PAID' ? 'PAID' : 'PENDING',
    };
  }

  const { data: quote } = await supabase
    .from('price_quotes')
    .select('total_amount, currency, match_id')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) return { ok: false, error: 'Devis introuvable.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.phone) return { ok: false, error: 'Numéro de téléphone manquant.' };

  let airtelTransactionId: string | null = null;
  if (providerCode === 'AIRTEL') {
    const { data: claimed } = await service.rpc('claim_payment_submission', {
      p_transaction_id: transactionId,
    });
    if (!claimed) {
      return { ok: true, transactionId, status: 'PENDING' };
    }
    airtelTransactionId = `LIG-COL-${transactionId}`;
    await service
      .from('transactions')
      .update({ provider_reference: airtelTransactionId })
      .eq('id', transactionId);
    await service.rpc('schedule_payment_enquiry', { p_transaction_id: transactionId });
  }

  try {
    const provider = providerFor(providerCode);
    const result = await provider.initiate({
      amount: Number(quote.total_amount),
      currency: quote.currency,
      payerPhone: profile.phone,
      reference: quoteId,
      idempotencyKey: airtelTransactionId ?? idempotencyKey,
      description: 'Frais de mise en relation Liguita',
    });
    await service
      .from('transactions')
      .update({
        provider_reference: result.providerReference,
        ...(result.airtelMoneyId ? { airtel_money_id: result.airtelMoneyId } : {}),
        ...(result.airtelStatus ? { airtel_status: result.airtelStatus } : {}),
        status:
          result.status === 'PAID'
            ? 'INITIATED'
            : result.status === 'FAILED'
              ? 'FAILED'
              : result.status === 'CANCELLED'
                ? 'CANCELLED'
                : 'PENDING',
      })
      .eq('id', transactionId)
      .in('status', ['INITIATED', 'PENDING', 'FAILED', 'CANCELLED']);
    if (result.status === 'FAILED' || result.status === 'CANCELLED') {
      await service
        .from('payment_enquiry_jobs')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('transaction_id', transactionId);
    }
    if (result.status !== 'PAID') {
      return { ok: true, transactionId, status: result.status, redirectUrl: result.redirectUrl };
    }
    const paid = await service.rpc('mark_payment_paid', {
      p_transaction_id: transactionId,
      p_provider_reference: result.providerReference,
      p_payload: result.airtelStatus
        ? { provider: providerCode, transaction: { status: result.airtelStatus } }
        : { provider: providerCode, status: 'PAID' },
      p_event_id: `initiation_${airtelTransactionId ?? idempotencyKey}`,
    });
    if (paid.error) return { ok: false, transactionId, error: paid.error.message };
    return {
      ok: true,
      transactionId,
      status: 'PAID',
      conversationId: (paid.data as { conversation_id?: string }).conversation_id,
    };
  } catch (error) {
    if (providerCode === 'AIRTEL') {
      await service
        .from('transactions')
        .update({
          failure_reason: 'Résultat Airtel inconnu. Vérification en cours.',
          provider_payload: { state: 'unknown' },
        })
        .eq('id', transactionId);
      return {
        ok: true,
        transactionId,
        status: 'PENDING',
        error: 'Vérification en cours. Ne relancez pas le paiement.',
      };
    }
    return {
      ok: false,
      transactionId,
      error: error instanceof Error ? error.message : 'Paiement impossible.',
    };
  }
}
