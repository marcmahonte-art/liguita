'use client';

import { Flag, ReceiptText, ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Alert, Card, Skeleton } from '@liguita/ui';

import { getAdminOverview } from '../actions/admin';
import { useAuth } from '../../lib/auth/auth-context';

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<{ users: number; objects: number; matches: number; transactions: number; reports: number; fraudCases: number; auditEvents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!authLoading && user) getAdminOverview().then((result) => { setData(result.data ?? null); setError(result.error ?? null); }); }, [authLoading, user]);
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  if (error) return <Alert tone="danger" title={error} />;
  return <div className="space-y-6"><div><p className="text-caption font-bold uppercase tracking-wide text-brand-700">Administration</p><h1 className="mt-1 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">Vue d’ensemble</h1><p className="mt-1 text-body text-ink-600">Pilotage de la plateforme Liguita.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><Users className="text-brand-700" /><p className="mt-3 font-display text-3xl font-extrabold">{data?.users ?? '—'}</p><p className="text-caption text-ink-500">Utilisateurs</p></Card><Card><ReceiptText className="text-success-700" /><p className="mt-3 font-display text-3xl font-extrabold">{data?.transactions ?? '—'}</p><p className="text-caption text-ink-500">Transactions</p></Card><Card><Flag className="text-warning-600" /><p className="mt-3 font-display text-3xl font-extrabold">{data?.reports ?? '—'}</p><p className="text-caption text-ink-500">Signalements</p></Card><Card><ShieldAlert className="text-danger-700" /><p className="mt-3 font-display text-3xl font-extrabold">{data?.fraudCases ?? '—'}</p><p className="text-caption text-ink-500">Dossiers fraude</p></Card></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Link href="/admin/users" className="rounded-xl border border-ink-200 bg-white p-4 hover:border-brand-300">Utilisateurs</Link><Link href="/admin/transactions" className="rounded-xl border border-ink-200 bg-white p-4 hover:border-brand-300">Transactions et remboursements</Link><Link href="/admin/reports" className="rounded-xl border border-ink-200 bg-white p-4 hover:border-brand-300">Signalements</Link><Link href="/admin/pricing" className="rounded-xl border border-ink-200 bg-white p-4 hover:border-brand-300">Tarification</Link></div></div>;
}
