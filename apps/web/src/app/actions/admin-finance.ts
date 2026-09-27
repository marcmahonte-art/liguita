'use server';

import { revalidatePath } from 'next/cache';

import { AirtelMoneyProvider } from '@liguita/payments';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';

/**
 * Console d'administration — volet financier : dépôts et retraits.
 *
 * ⚠️ Règle de cloisonnement de cette couche :
 *   · **MODERATOR** instruit et consulte ;
 *   · **ADMIN** agit sur l'argent (valider, refuser, payer).
 *
 * La distinction n'est pas décorative. Laisser un modérateur valider un retrait
 * reviendrait à donner le droit de sortir des fonds du compte marchand à
 * quiconque peut traiter une réclamation. Les RPC en base refusent d'ailleurs
 * l'opération (`is_platform_admin()`), mais on refuse aussi côté serveur : une
 * erreur SQL remontée brute à l'écran est une mauvaise façon d'apprendre une
 * règle métier.
 */

type StaffRole = 'MODERATOR' | 'ADMIN';

async function requireStaff(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string } | null;
  role: StaffRole | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, role: null, error: 'Non connecté' };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();
  const role =
    profile?.app_role === 'ADMIN' || profile?.app_role === 'MODERATOR' ? profile.app_role : null;
  return {
    supabase,
    user: { id: user.id },
    role,
    error: role ? undefined : 'Accès réservé à l’administration.',
  };
}

/** Variante stricte : n'accepte que les administrateurs. */
async function requireAdminOnly() {
  const context = await requireStaff();
  if (!context.user || context.role !== 'ADMIN') {
    return { ...context, error: context.error ?? 'Action réservée aux administrateurs.' };
  }
  return context;
}

/**
 * Construit l'adaptateur Airtel pour le **versement**.
 *
 * Le PIN marchand est lu depuis l'environnement et ne quitte pas ce module :
 * il n'est ni renvoyé à l'interface, ni journalisé, ni stocké.
 */
function airtelPayoutProvider(): AirtelMoneyProvider | null {
  const isProduction = (process.env.LIGUITA_AIRTEL_ENV ?? process.env.AIRTEL_TD_ENV) === 'prod';
  const endpoint =
    process.env.AIRTEL_BASE_URL ??
    process.env.AIRTEL_TD_BASE_URL ??
    (isProduction ? process.env.AIRTEL_TD_PROD_BASE_URL : process.env.AIRTEL_TD_UAT_BASE_URL) ??
    '';
  const clientId = isProduction
    ? process.env.AIRTEL_TD_PROD_CLIENT_ID ?? process.env.AIRTEL_TD_CLIENT_ID
    : process.env.AIRTEL_TD_UAT_CLIENT_ID ?? process.env.AIRTEL_TD_CLIENT_ID;
  const clientSecret = isProduction
    ? process.env.AIRTEL_TD_PROD_CLIENT_SECRET ?? process.env.AIRTEL_TD_CLIENT_SECRET
    : process.env.AIRTEL_TD_UAT_CLIENT_SECRET ?? process.env.AIRTEL_TD_CLIENT_SECRET;

  if (!endpoint || !clientId || !clientSecret) return null;

  return new AirtelMoneyProvider({
    secret: process.env.AIRTEL_TD_HMAC_PRIVATE_KEY ?? '',
    endpoint,
    clientId,
    clientSecret,
    merchantPhone: process.env.AIRTEL_TD_MERCHANT_MSISDN ?? '',
    merchantPin: process.env.AIRTEL_TD_MERCHANT_PIN ?? '',
  });
}

/* -------------------------------------------------------------------------- */
/* Types partagés avec l'interface                                             */
/* -------------------------------------------------------------------------- */

export interface AdminWithdrawalRow {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  status: string;
  requestedAt: string;
  slaDueAt: string;
  /** Le délai annoncé au trouveur est-il dépassé ? Calculé côté serveur. */
  isOverdue: boolean;
  reviewedAt: string | null;
  reviewNote: string | null;
  providerReference: string | null;
  payoutAttempts: number;
  failureReason: string | null;
  beneficiaryId: string;
  beneficiaryName: string;
  /** Solde disponible du trouveur, pour repérer un retrait inhabituel. */
  beneficiaryBalance: number | null;
}

export interface AdminFinanceOverview {
  deposits: {
    paidCount: number;
    paidAmount: number;
    pendingCount: number;
    pendingAmount: number;
    failedCount: number;
    refundedAmount: number;
    todayCount: number;
    todayAmount: number;
  };
  commissions: {
    totalCommission: number;
    totalVat: number;
    totalRewards: number;
    totalBonus: number;
    totalDelivery: number;
  };
  withdrawals: {
    requestedCount: number;
    requestedAmount: number;
    inFlightCount: number;
    inFlightAmount: number;
    manualReviewCount: number;
    paidCount: number;
    paidAmount: number;
    failedCount: number;
    overdueCount: number;
    oldestWaitingAt: string | null;
  };
  wallets: {
    accountCount: number;
    availableTotal: number;
    pendingTotal: number;
    reservedEntries: number;
    heldEntries: number;
  };
  paymentHealth: {
    events24h: number;
    eventsUnprocessed: number;
    enquiryPending: number;
    enquiryUnknown: number;
  };
  at: string;
}

export interface AdminWalletRow {
  userId: string;
  displayName: string;
  email: string | null;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  status: string;
  entryCount: number;
}

export interface AdminPaymentEventRow {
  id: string;
  transactionId: string;
  publicRef: string | null;
  provider: string;
  eventType: string;
  eventId: string;
  airtelStatus: string | null;
  receivedAt: string;
  processedAt: string | null;
  processingStatus: string | null;
}

export interface AdminEnquiryJobRow {
  id: string;
  transactionId: string;
  publicRef: string | null;
  attempt: number;
  status: string;
  nextAttemptAt: string;
  lastError: string | null;
}

/* -------------------------------------------------------------------------- */
/* Vue d'ensemble financière                                                   */
/* -------------------------------------------------------------------------- */

export async function getAdminFinanceOverview(): Promise<{
  data?: AdminFinanceOverview;
  error?: string;
}> {
  const { user, role, error } = await requireStaff();
  if (!user || !role) return { error };

  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc('admin_finance_overview');
  if (rpcError || !data) {
    return { error: rpcError?.message ?? 'Tableau de bord financier indisponible.' };
  }

  /* La RPC renvoie un jsonb en snake_case : c'est la convention PostgreSQL, et
     la traduire en base serait une couche de plus à maintenir. On la mappe ici,
     à un seul endroit, plutôt que d'imposer le camelCase à SQL. */
  const raw = data as Record<string, Record<string, number | string | null>>;
  return {
    data: {
      deposits: {
        paidCount: Number(raw.deposits?.paid_count ?? 0),
        paidAmount: Number(raw.deposits?.paid_amount ?? 0),
        pendingCount: Number(raw.deposits?.pending_count ?? 0),
        pendingAmount: Number(raw.deposits?.pending_amount ?? 0),
        failedCount: Number(raw.deposits?.failed_count ?? 0),
        refundedAmount: Number(raw.deposits?.refunded_amount ?? 0),
        todayCount: Number(raw.deposits?.today_count ?? 0),
        todayAmount: Number(raw.deposits?.today_amount ?? 0),
      },
      commissions: {
        totalCommission: Number(raw.commissions?.total_commission ?? 0),
        totalVat: Number(raw.commissions?.total_vat ?? 0),
        totalRewards: Number(raw.commissions?.total_rewards ?? 0),
        totalBonus: Number(raw.commissions?.total_bonus ?? 0),
        totalDelivery: Number(raw.commissions?.total_delivery ?? 0),
      },
      withdrawals: {
        requestedCount: Number(raw.withdrawals?.requested_count ?? 0),
        requestedAmount: Number(raw.withdrawals?.requested_amount ?? 0),
        inFlightCount: Number(raw.withdrawals?.in_flight_count ?? 0),
        inFlightAmount: Number(raw.withdrawals?.in_flight_amount ?? 0),
        manualReviewCount: Number(raw.withdrawals?.manual_review_count ?? 0),
        paidCount: Number(raw.withdrawals?.paid_count ?? 0),
        paidAmount: Number(raw.withdrawals?.paid_amount ?? 0),
        failedCount: Number(raw.withdrawals?.failed_count ?? 0),
        overdueCount: Number(raw.withdrawals?.overdue_count ?? 0),
        oldestWaitingAt: (raw.withdrawals?.oldest_waiting_at as string | null) ?? null,
      },
      wallets: {
        accountCount: Number(raw.wallets?.account_count ?? 0),
        availableTotal: Number(raw.wallets?.available_total ?? 0),
        pendingTotal: Number(raw.wallets?.pending_total ?? 0),
        reservedEntries: Number(raw.wallets?.reserved_entries ?? 0),
        heldEntries: Number(raw.wallets?.held_entries ?? 0),
      },
      paymentHealth: {
        events24h: Number(raw.paymentHealth?.events_24h ?? 0),
        eventsUnprocessed: Number(raw.paymentHealth?.events_unprocessed ?? 0),
        enquiryPending: Number(raw.paymentHealth?.enquiry_pending ?? 0),
        enquiryUnknown: Number(raw.paymentHealth?.enquiry_unknown ?? 0),
      },
      at: String(raw.at ?? new Date().toISOString()),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Retraits                                                                    */
/* -------------------------------------------------------------------------- */

export async function listAdminWithdrawals(status?: string): Promise<{
  items: AdminWithdrawalRow[];
  error?: string;
}> {
  const { user, role, error } = await requireStaff();
  if (!user || !role) return { items: [], error };

  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };

  let query = service
    .from('withdrawals')
    .select(
      'id, user_id, amount, currency, destination_msisdn, status, requested_at, sla_due_at, reviewed_at, review_note, provider_reference, payout_attempts, failure_reason',
    )
    .order('requested_at', { ascending: true })
    .limit(200);
  if (status && status !== 'ALL') query = query.eq('status', status);

  const { data, error: queryError } = await query;
  if (queryError) return { items: [], error: queryError.message };

  const rows = data ?? [];
  const beneficiaryIds = [...new Set(rows.map((row) => row.user_id))];

  /* Deux requêtes groupées plutôt qu'une par ligne : la liste peut porter
     plusieurs centaines de demandes et une requête par ligne ferait s'écrouler
     la page sur une connexion mobile. */
  const [profilesResult, walletsResult] = await Promise.all([
    beneficiaryIds.length
      ? service
          .from('profiles')
          .select('id, first_name, last_name, full_name, display_name, email')
          .in('id', beneficiaryIds)
      : Promise.resolve({ data: [], error: null }),
    beneficiaryIds.length
      ? service.from('wallet_accounts').select('user_id, available_balance').in('user_id', beneficiaryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const nameById = new Map<string, string>();
  for (const profile of profilesResult.data ?? []) {
    const row = profile as Record<string, string | null>;
    const name =
      row.display_name ??
      row.full_name ??
      [row.first_name, row.last_name].filter(Boolean).join(' ') ??
      null;
    nameById.set(
      row.id as string,
      name && name.trim() ? name : (row.email as string) ?? 'Trouveur',
    );
  }

  const balanceById = new Map<string, number>();
  for (const wallet of walletsResult.data ?? []) {
    const row = wallet as Record<string, unknown>;
    balanceById.set(row.user_id as string, Number(row.available_balance ?? 0));
  }

  const now = Date.now();
  return {
    items: rows.map((row) => ({
      id: row.id as string,
      amount: Number(row.amount),
      currency: (row.currency as string) ?? 'XAF',
      destination: row.destination_msisdn as string,
      status: row.status as string,
      requestedAt: row.requested_at as string,
      slaDueAt: row.sla_due_at as string,
      isOverdue:
        (['REQUESTED', 'MANUAL_REVIEW'] as string[]).includes(row.status as string) &&
        new Date(row.sla_due_at as string).getTime() < now,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      reviewNote: (row.review_note as string | null) ?? null,
      providerReference: (row.provider_reference as string | null) ?? null,
      payoutAttempts: Number(row.payout_attempts ?? 0),
      failureReason: (row.failure_reason as string | null) ?? null,
      beneficiaryId: row.user_id as string,
      beneficiaryName: nameById.get(row.user_id as string) ?? 'Trouveur',
      beneficiaryBalance: balanceById.get(row.user_id as string) ?? null,
    })),
  };
}

export async function listAdminWallets(): Promise<{ items: AdminWalletRow[]; error?: string }> {
  const { user, role, error } = await requireStaff();
  if (!user || !role) return { items: [], error };

  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };

  const { data, error: queryError } = await service
    .from('wallet_accounts')
    .select('user_id, available_balance, pending_balance, currency, status')
    .order('available_balance', { ascending: false })
    .limit(200);
  if (queryError) return { items: [], error: queryError.message };

  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id as string);
  const { data: profiles } = userIds.length
    ? await service
        .from('profiles')
        .select('id, first_name, last_name, full_name, display_name, email')
        .in('id', userIds)
    : { data: [] };

  const byId = new Map<string, { name: string; email: string | null }>();
  for (const profile of profiles ?? []) {
    const row = profile as Record<string, string | null>;
    const name =
      row.display_name ?? row.full_name ?? [row.first_name, row.last_name].filter(Boolean).join(' ');
    byId.set(row.id as string, {
      name: name && name.trim() ? name : (row.email as string) ?? 'Utilisateur',
      email: (row.email as string | null) ?? null,
    });
  }

  return {
    items: rows.map((row) => ({
      userId: row.user_id as string,
      displayName: byId.get(row.user_id as string)?.name ?? 'Utilisateur',
      email: byId.get(row.user_id as string)?.email ?? null,
      availableBalance: Number(row.available_balance ?? 0),
      pendingBalance: Number(row.pending_balance ?? 0),
      currency: (row.currency as string) ?? 'XAF',
      status: (row.status as string) ?? 'ACTIVE',
      entryCount: 0,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Actions sur un retrait                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Valide une demande puis tente le versement.
 *
 * Le versement n'est **pas** bloquant pour la validation : si l'opérateur est
 * injoignable, la demande reste validée (`SUBMITTED`) et l'administrateur peut
 * réessayer ou payer manuellement. L'inverse — tout annuler parce qu'Airtel ne
 * répond pas — ferait perdre une décision humaine correcte à cause d'une panne
 * réseau.
 */
export async function approveWithdrawal(
  withdrawalId: string,
  note?: string,
): Promise<{ ok: boolean; error?: string; payout?: 'SENT' | 'FAILED' | 'MANUAL'; message?: string }> {
  const { user, role, error } = await requireAdminOnly();
  if (!user || !role) return { ok: false, error };

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { data: approved, error: rpcError } = await service.rpc('admin_approve_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_note: note?.trim() || null,
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  const { data: withdrawal } = await service
    .from('withdrawals')
    .select('id, amount, currency, destination_msisdn, idempotency_key')
    .eq('id', withdrawalId)
    .maybeSingle();
  if (!withdrawal) return { ok: false, error: 'Retrait introuvable après validation.' };

  const provider = airtelPayoutProvider();
  if (!provider || !provider.payoutReady) {
    revalidatePath('/admin/retraits');
    return {
      ok: true,
      payout: 'MANUAL',
      message:
        'Demande validée. Le versement automatique est indisponible (PIN marchand non configuré) : réglez le trouveur puis marquez le retrait payé.',
      ...(approved ? {} : {}),
    };
  }

  try {
    const result = await provider.initiatePayout({
      amount: Number(withdrawal.amount),
      currency: (withdrawal.currency as string) ?? 'XAF',
      recipientPhone: withdrawal.destination_msisdn as string,
      reference: withdrawalId,
      idempotencyKey: (withdrawal.idempotency_key as string) ?? `wd_${withdrawalId}`,
      description: 'Versement recompense Liguita',
    });

    await service.rpc('admin_record_payout_attempt', {
      p_withdrawal_id: withdrawalId,
      p_provider_reference: result.providerReference,
      p_provider_status: result.settled ? 'PAID' : 'PENDING',
      p_request_payload: null,
      p_response_payload: {
        providerReference: result.providerReference,
        providerStatus: result.providerStatus ?? null,
        settled: result.settled,
      },
      p_error: null,
    });

    revalidatePath('/admin/retraits');
    revalidatePath('/admin/tresorerie');
    return {
      ok: true,
      payout: 'SENT',
      message: result.settled
        ? 'Versement confirmé par Airtel.'
        : 'Versement soumis à Airtel. Le statut se mettra à jour à la confirmation.',
    };
  } catch (payoutError) {
    const message = payoutError instanceof Error ? payoutError.message : 'Erreur de versement.';

    /* On enregistre l'échec **sans** défaire la validation : le retrait passe en
       revue manuelle, l'argent reste bloqué, et l'administrateur décide de la
       suite (réessayer, payer autrement, ou libérer). */
    await service.rpc('admin_record_payout_attempt', {
      p_withdrawal_id: withdrawalId,
      p_provider_reference: null,
      p_provider_status: 'FAILED',
      p_request_payload: null,
      p_response_payload: null,
      p_error: message,
    });

    revalidatePath('/admin/retraits');
    revalidatePath('/admin/tresorerie');
    return {
      ok: true,
      payout: 'FAILED',
      message: `Demande validée, mais Airtel a refusé le versement : ${message}`,
    };
  }
}

export async function rejectWithdrawal(
  withdrawalId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdminOnly();
  if (!user || !role) return { ok: false, error };
  if (!reason.trim() || reason.trim().length < 5) {
    return { ok: false, error: 'Un motif de refus d’au moins 5 caractères est requis.' };
  }

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { error: rpcError } = await service.rpc('admin_reject_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_reason: reason.trim(),
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  revalidatePath('/admin/retraits');
  revalidatePath('/admin/tresorerie');
  return { ok: true };
}

/**
 * Règle manuellement un retrait.
 *
 * Chemin légitime, pas un contournement : au lancement, Airtel peut très bien
 * créditer le trouveur sans que sa notification ne nous parvienne. Refuser ce
 * bouton obligerait à bricoler en base.
 */
export async function markWithdrawalPaid(
  withdrawalId: string,
  providerReference?: string,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdminOnly();
  if (!user || !role) return { ok: false, error };

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { error: rpcError } = await service.rpc('admin_mark_withdrawal_paid', {
    p_withdrawal_id: withdrawalId,
    p_provider_reference: providerReference?.trim() || null,
    p_note: note?.trim() || 'Règlement manuel depuis la console',
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  revalidatePath('/admin/retraits');
  revalidatePath('/admin/tresorerie');
  return { ok: true };
}

/** Libère le blocage : l'opérateur a échoué, l'argent retourne au trouveur. */
export async function releaseWithdrawalHold(
  withdrawalId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdminOnly();
  if (!user || !role) return { ok: false, error };
  if (!reason.trim() || reason.trim().length < 5) {
    return { ok: false, error: 'Un motif d’au moins 5 caractères est requis.' };
  }

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { error: rpcError } = await service.rpc('admin_release_withdrawal_hold', {
    p_withdrawal_id: withdrawalId,
    p_reason: reason.trim(),
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  revalidatePath('/admin/retraits');
  revalidatePath('/admin/tresorerie');
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Santé des paiements : webhooks et rapprochement                             */
/* -------------------------------------------------------------------------- */

export async function listAdminPaymentEvents(): Promise<{
  items: AdminPaymentEventRow[];
  error?: string;
}> {
  const { user, role, error } = await requireStaff();
  if (!user || !role) return { items: [], error };

  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };

  const { data, error: queryError } = await service
    .from('payment_events')
    .select(
      'id, transaction_id, provider, event_type, event_id, airtel_status, received_at, processed_at, processing_status',
    )
    .order('received_at', { ascending: false })
    .limit(100);
  if (queryError) return { items: [], error: queryError.message };

  const rows = data ?? [];
  const transactionIds = [...new Set(rows.map((row) => row.transaction_id as string))];
  const { data: transactions } = transactionIds.length
    ? await service.from('transactions').select('id, public_ref').in('id', transactionIds)
    : { data: [] };
  const refById = new Map<string, string>();
  for (const transaction of transactions ?? []) {
    refById.set(transaction.id as string, (transaction.public_ref as string) ?? '');
  }

  return {
    items: rows.map((row) => ({
      id: row.id as string,
      transactionId: row.transaction_id as string,
      publicRef: refById.get(row.transaction_id as string) ?? null,
      provider: row.provider as string,
      eventType: row.event_type as string,
      eventId: row.event_id as string,
      airtelStatus: (row.airtel_status as string | null) ?? null,
      receivedAt: row.received_at as string,
      processedAt: (row.processed_at as string | null) ?? null,
      processingStatus: (row.processing_status as string | null) ?? null,
    })),
  };
}

export async function listAdminEnquiryJobs(): Promise<{
  items: AdminEnquiryJobRow[];
  error?: string;
}> {
  const { user, role, error } = await requireStaff();
  if (!user || !role) return { items: [], error };

  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };

  const { data, error: queryError } = await service
    .from('payment_enquiry_jobs')
    .select('id, transaction_id, attempt, status, next_attempt_at, last_error')
    .order('next_attempt_at', { ascending: true })
    .limit(100);
  if (queryError) return { items: [], error: queryError.message };

  const rows = data ?? [];
  const transactionIds = [...new Set(rows.map((row) => row.transaction_id as string))];
  const { data: transactions } = transactionIds.length
    ? await service.from('transactions').select('id, public_ref').in('id', transactionIds)
    : { data: [] };
  const refById = new Map<string, string>();
  for (const transaction of transactions ?? []) {
    refById.set(transaction.id as string, (transaction.public_ref as string) ?? '');
  }

  return {
    items: rows.map((row) => ({
      id: row.id as string,
      transactionId: row.transaction_id as string,
      publicRef: refById.get(row.transaction_id as string) ?? null,
      attempt: Number(row.attempt ?? 0),
      status: row.status as string,
      nextAttemptAt: row.next_attempt_at as string,
      lastError: (row.last_error as string | null) ?? null,
    })),
  };
}

/** Relance immédiate d'un rapprochement, sans attendre le prochain cron. */
export async function requeueEnquiry(
  transactionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireStaff();
  if (!user || !role) return { ok: false, error };

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };

  const { error: rpcError } = await service.rpc('admin_requeue_enquiry', {
    p_transaction_id: transactionId,
  });
  if (rpcError) return { ok: false, error: rpcError.message };

  revalidatePath('/admin/paiements');
  return { ok: true };
}
