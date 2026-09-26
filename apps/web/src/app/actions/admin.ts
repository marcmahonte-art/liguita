'use server';

import { revalidatePath } from 'next/cache';

import { publicNameOf } from '../../lib/auth/identity';
import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as 'MODERATOR' | 'ADMIN' | null, error: 'Non connecté' };
  const { data: profile } = await supabase.from('profiles').select('app_role').eq('id', user.id).maybeSingle();
  const role = profile?.app_role === 'ADMIN' || profile?.app_role === 'MODERATOR' ? profile.app_role : null;
  return { supabase, user, role, error: role ? undefined : 'Accès réservé à l’administration.' };
}

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  authProvider: string;
  appRole: string;
  isBlocked: boolean;
  createdAt: string;
}

export async function listAdminUsers(): Promise<{ items: AdminUserRow[]; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { items: [], error };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service
    .from('profiles')
    .select('id, first_name, last_name, full_name, display_name, email, avatar_url, auth_provider, app_role, is_blocked, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (queryError) return { items: [], error: 'Liste des utilisateurs indisponible.' };
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      /* Même résolution que le reste de l'application : un modérateur doit retrouver
         un membre par le nom qu'il voit dans l'interface, pas par un numéro. */
      displayName: publicNameOf(row) ?? 'Utilisateur',
      email: row.email ?? null,
      avatarUrl: row.avatar_url ?? null,
      authProvider: row.auth_provider ?? 'EMAIL',
      appRole: row.app_role,
      isBlocked: row.is_blocked,
      createdAt: row.created_at,
    })),
  };
}

export async function listAdminObjects(): Promise<{ items: Array<{ id: string; title: string; status: string; citySlug: string; createdAt: string }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { items: [], error };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('found_items').select('id, title, status, city_slug, created_at').order('created_at', { ascending: false }).limit(100);
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, title: row.title, status: row.status, citySlug: row.city_slug, createdAt: row.created_at })) };
}

export async function listAdminMatches(): Promise<{ items: Array<{ id: string; status: string; score: number; createdAt: string }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { items: [], error };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('matches').select('id, status, score, created_at').order('created_at', { ascending: false }).limit(100);
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, status: row.status, score: Number(row.score), createdAt: row.created_at })) };
}

export async function getAdminOverview(): Promise<{ data?: { users: number; objects: number; matches: number; transactions: number; reports: number; fraudCases: number; auditEvents: number }; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { error };
  const service = tryCreateServiceClient();
  if (!service) return { error: 'Service indisponible.' };
  const [users, objects, matches, transactions, reports, fraudCases, auditEvents] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }),
    service.from('found_items').select('id', { count: 'exact', head: true }),
    service.from('matches').select('id', { count: 'exact', head: true }),
    service.from('transactions').select('id', { count: 'exact', head: true }),
    service.from('reports').select('id', { count: 'exact', head: true }),
    service.from('fraud_cases').select('id', { count: 'exact', head: true }),
    service.from('audit_logs').select('id', { count: 'exact', head: true }),
  ]);
  return { data: { users: users.count ?? 0, objects: objects.count ?? 0, matches: matches.count ?? 0, transactions: transactions.count ?? 0, reports: reports.count ?? 0, fraudCases: fraudCases.count ?? 0, auditEvents: auditEvents.count ?? 0 } };
}

export async function listAdminTransactions(): Promise<{ items: Array<{ id: string; publicRef: string; amount: number; status: string; provider: string; payerId: string; createdAt: string; refundAmount: number }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { items: [], error };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('transactions').select('id, public_ref, amount, status, provider, payer_id, created_at, refund_amount').order('created_at', { ascending: false }).limit(100);
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, publicRef: row.public_ref, amount: Number(row.amount), status: row.status, provider: row.provider, payerId: row.payer_id, createdAt: row.created_at, refundAmount: Number(row.refund_amount) })) };
}

export async function createAdminRefund(transactionId: string, amount: number, reason: string): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || role !== 'ADMIN') return { ok: false, error: error ?? 'Administrateur requis.' };
  if (!reason.trim() || amount <= 0) return { ok: false, error: 'Montant et motif requis.' };
  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };
  const idempotencyKey = `admin_refund_${transactionId}_${crypto.randomUUID()}`;
  const { data, error: rpcError } = await service.rpc('create_refund', { p_transaction_id: transactionId, p_amount: Math.trunc(amount), p_reason: reason.trim(), p_idempotency_key: idempotencyKey });
  if (rpcError || !data) return { ok: false, error: rpcError?.message ?? 'Remboursement impossible.' };
  await service.from('audit_logs').insert({ actor_id: user.id, actor_role: 'ADMIN', action: 'payment.refund', target_kind: 'transaction', target_id: transactionId, after: { refund_id: data, amount: Math.trunc(amount), reason: reason.trim() } });
  revalidatePath('/admin/transactions');
  return { ok: true };
}

export async function listAdminReports(): Promise<{ items: Array<{ id: string; reason: string; status: string; details: string; createdAt: string }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { items: [], error };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('reports').select('id, reason, status, details, created_at').order('created_at', { ascending: false }).limit(100);
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, reason: row.reason, status: row.status, details: row.details, createdAt: row.created_at })) };
}

export async function updateAdminReport(id: string, status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED', resolution?: string): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { ok: false, error };
  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };
  const { data: before } = await service.from('reports').select('status').eq('id', id).maybeSingle();
  const { error: updateError } = await service.from('reports').update({ status, resolution: resolution?.trim() || null, reviewed_at: new Date().toISOString(), closed_at: status === 'RESOLVED' || status === 'DISMISSED' ? new Date().toISOString() : null }).eq('id', id);
  if (updateError) return { ok: false, error: updateError.message };
  await service.from('audit_logs').insert({ actor_id: user.id, actor_role: role, action: 'report.update', target_kind: 'report', target_id: id, before, after: { status, resolution } });
  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function listAdminFraudCases(): Promise<{ items: Array<{ id: string; kind: string; status: string; riskScore: number; createdAt: string }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { items: [], error };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('fraud_cases').select('id, kind, status, risk_score, created_at').order('created_at', { ascending: false }).limit(100);
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, kind: row.kind, status: row.status, riskScore: row.risk_score, createdAt: row.created_at })) };
}

export async function updateAdminFraudCase(id: string, status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED', resolution?: string): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || !role) return { ok: false, error };
  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };
  const { data: before } = await service.from('fraud_cases').select('status').eq('id', id).maybeSingle();
  const { error: updateError } = await service.from('fraud_cases').update({ status, resolution: resolution?.trim() || null, closed_at: status === 'RESOLVED' || status === 'DISMISSED' ? new Date().toISOString() : null }).eq('id', id);
  if (updateError) return { ok: false, error: updateError.message };
  await service.from('audit_logs').insert({ actor_id: user.id, actor_role: role, action: 'fraud.update', target_kind: 'fraud_case', target_id: id, before, after: { status, resolution } });
  revalidatePath('/admin/fraud');
  return { ok: true };
}

export async function listAdminAuditLogs(): Promise<{ items: Array<{ id: number; actorId: string | null; actorRole: string | null; action: string; targetKind: string | null; targetId: string | null; createdAt: string }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || role !== 'ADMIN') return { items: [], error: error ?? 'Administrateur requis.' };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('audit_logs').select('id, actor_id, actor_role, action, target_kind, target_id, created_at').order('created_at', { ascending: false }).limit(100);
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, actorId: row.actor_id, actorRole: row.actor_role, action: row.action, targetKind: row.target_kind, targetId: row.target_id, createdAt: row.created_at })) };
}

export async function listAdminPricingRules(): Promise<{ items: Array<{ id: string; version: number; isActive: boolean; createdAt: string }>; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || role !== 'ADMIN') return { items: [], error: error ?? 'Administrateur requis.' };
  const service = tryCreateServiceClient();
  if (!service) return { items: [], error: 'Service indisponible.' };
  const { data, error: queryError } = await service.from('pricing_rules').select('id, version, is_active, created_at').order('version', { ascending: false });
  if (queryError) return { items: [], error: queryError.message };
  return { items: (data ?? []).map((row) => ({ id: row.id, version: row.version, isActive: row.is_active, createdAt: row.created_at })) };
}

export async function publishAdminPricingRule(input: {
  fees: Record<string, number>;
  rewards: Record<string, number>;
  c5: { rate: number; floor: number; ceiling: number; rewardRate: number };
  options: { urgentRate: number; conciergerieFee: number; deliveryFee: number; deliveryIsProxy: boolean };
  tax: { vatRate: number; commissionIsHt: boolean };
  thresholds: Record<string, number>;
  valueBands: Array<{ upTo: number | null; pricingClass: string }>;
}): Promise<{ ok: boolean; error?: string }> {
  const { user, role, error } = await requireAdmin();
  if (!user || role !== 'ADMIN') return { ok: false, error: error ?? 'Administrateur requis.' };
  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };
  const { error: rpcError } = await service.rpc('publish_pricing_rule', { p_country_code: 'TD', p_currency: 'XAF', p_fees: input.fees, p_rewards: input.rewards, p_c5: input.c5, p_options: input.options, p_tax: input.tax, p_thresholds: input.thresholds, p_value_bands: input.valueBands });
  if (rpcError) return { ok: false, error: rpcError.message };
  revalidatePath('/admin/pricing');
  return { ok: true };
}
