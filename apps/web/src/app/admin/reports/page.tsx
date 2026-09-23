'use client';

import { useEffect, useState, useTransition } from 'react';

import { Alert, Badge, Card, Skeleton } from '@liguita/ui';

import { listAdminReports, updateAdminReport } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; reason: string; status: string; details: string; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  useEffect(() => { if (!authLoading && user) listAdminReports().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  function update(id: string, status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED') { startTransition(async () => { const result = await updateAdminReport(id, status, 'Décision administrative'); if (result.error) setError(result.error); else { const refresh = await listAdminReports(); setItems(refresh.items); } }); }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Signalements</h1>{error ? <Alert tone="danger" title={error} /> : null}<div className="space-y-3">{items.map((item) => <Card key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display font-bold text-ink-950">{item.reason}</p><p className="mt-1 text-body-sm text-ink-700">{item.details}</p><p className="mt-2 text-caption text-ink-500">{item.createdAt.slice(0, 10)}</p></div><Badge tone={item.status === 'RESOLVED' ? 'found' : 'pending'}>{item.status}</Badge></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={isPending} onClick={() => update(item.id, 'REVIEWING')} className="rounded-lg border border-ink-300 px-3 py-2 text-caption font-bold">Examiner</button><button type="button" disabled={isPending} onClick={() => update(item.id, 'RESOLVED')} className="rounded-lg border border-ink-300 px-3 py-2 text-caption font-bold">Résoudre</button><button type="button" disabled={isPending} onClick={() => update(item.id, 'DISMISSED')} className="rounded-lg border border-ink-300 px-3 py-2 text-caption font-bold">Rejeter</button></div></Card>)}</div></div>;
}
