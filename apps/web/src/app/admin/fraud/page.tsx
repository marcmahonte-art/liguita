'use client';

import { useEffect, useState, useTransition } from 'react';

import { Alert, Badge, Card, Skeleton } from '@liguita/ui';

import { listAdminFraudCases, updateAdminFraudCase } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminFraudPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; kind: string; status: string; riskScore: number; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  useEffect(() => { if (!authLoading && user) listAdminFraudCases().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  function update(id: string, status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED') { startTransition(async () => { const result = await updateAdminFraudCase(id, status, 'Décision administrative'); if (result.error) setError(result.error); else { const refresh = await listAdminFraudCases(); setItems(refresh.items); } }); }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Dossiers de fraude</h1>{error ? <Alert tone="danger" title={error} /> : null}<div className="space-y-3">{items.map((item) => <Card key={item.id}><div className="flex items-center justify-between gap-3"><div><p className="font-display font-bold text-ink-950">{item.kind}</p><p className="text-caption text-ink-500">{item.createdAt.slice(0, 10)}</p></div><Badge tone={item.riskScore >= 80 ? 'urgent' : 'pending'}>{item.status} · {item.riskScore}</Badge></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={isPending} onClick={() => update(item.id, 'REVIEWING')} className="rounded-lg border border-ink-300 px-3 py-2 text-caption font-bold">Examiner</button><button type="button" disabled={isPending} onClick={() => update(item.id, 'RESOLVED')} className="rounded-lg border border-ink-300 px-3 py-2 text-caption font-bold">Résoudre</button><button type="button" disabled={isPending} onClick={() => update(item.id, 'DISMISSED')} className="rounded-lg border border-ink-300 px-3 py-2 text-caption font-bold">Rejeter</button></div></Card>)}</div></div>;
}
