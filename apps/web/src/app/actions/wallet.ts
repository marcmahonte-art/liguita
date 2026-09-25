'use server';

import { createClient } from '../../lib/supabase/server';

export interface WalletEntryItem {
  id: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  status: string;
  sourceType: string;
  createdAt: string;
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  destination: string;
  status: string;
  requestedAt: string;
  slaDueAt: string;
  failureReason: string | null;
}

export interface WalletSummary {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  entries: WalletEntryItem[];
  withdrawals: WithdrawalItem[];
}

export async function getWallet(): Promise<{ wallet: WalletSummary; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { wallet: emptyWallet(), error: 'Non connecté' };

  const [accountResult, entriesResult, withdrawalsResult] = await Promise.all([
    supabase
      .from('wallet_accounts')
      .select('available_balance, pending_balance, currency')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('wallet_entries')
      .select('id, direction, amount, status, source_type, created_at')
      .eq('wallet_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('withdrawals')
      .select('id, amount, destination_msisdn, status, requested_at, sla_due_at, failure_reason')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (accountResult.error) return { wallet: emptyWallet(), error: accountResult.error.message };
  if (entriesResult.error) return { wallet: emptyWallet(), error: entriesResult.error.message };
  if (withdrawalsResult.error) return { wallet: emptyWallet(), error: withdrawalsResult.error.message };

  return {
    wallet: {
      availableBalance: Number(accountResult.data?.available_balance ?? 0),
      pendingBalance: Number(accountResult.data?.pending_balance ?? 0),
      currency: accountResult.data?.currency ?? 'XAF',
      entries: (entriesResult.data ?? []).map((entry) => ({
        id: entry.id,
        direction: entry.direction as 'CREDIT' | 'DEBIT',
        amount: Number(entry.amount),
        status: entry.status,
        sourceType: entry.source_type,
        createdAt: entry.created_at,
      })),
      withdrawals: (withdrawalsResult.data ?? []).map((withdrawal) => ({
        id: withdrawal.id,
        amount: Number(withdrawal.amount),
        destination: withdrawal.destination_msisdn,
        status: withdrawal.status,
        requestedAt: withdrawal.requested_at,
        slaDueAt: withdrawal.sla_due_at,
        failureReason: withdrawal.failure_reason,
      })),
    },
  };
}

export async function requestAirtelWithdrawal(
  amount: number,
  idempotencyKey: string,
): Promise<{ ok: boolean; error?: string; withdrawalId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  if (!Number.isInteger(amount) || amount < 2500) {
    return { ok: false, error: 'Le minimum de retrait est de 2500 XAF.' };
  }
  const { data, error } = await supabase.rpc('request_wallet_withdrawal', {
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });
  if (error || !data) return { ok: false, error: error?.message ?? 'Demande impossible.' };
  return { ok: true, withdrawalId: data as string };
}

function emptyWallet(): WalletSummary {
  return {
    availableBalance: 0,
    pendingBalance: 0,
    currency: 'XAF',
    entries: [],
    withdrawals: [],
  };
}
