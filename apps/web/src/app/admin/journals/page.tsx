'use client';

import { useEffect, useState } from 'react';

import { Alert, Card, Skeleton } from '@liguita/ui';

import { listAdminAuditLogs } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminJournalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: number; actorId: string | null; actorRole: string | null; action: string; targetKind: string | null; targetId: string | null; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!authLoading && user) listAdminAuditLogs().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Journaux</h1>{error ? <Alert tone="danger" title={error} /> : null}<div className="space-y-2">{items.map((item) => <Card key={item.id}><div className="flex flex-wrap justify-between gap-3"><p className="font-display font-bold text-ink-950">{item.action}</p><span className="text-caption text-ink-500">{item.createdAt.slice(0, 16).replace('T', ' ')}</span></div><p className="mt-1 text-caption text-ink-500">{item.targetKind ?? '—'} · {item.actorRole ?? 'système'}</p></Card>)}</div></div>;
}
