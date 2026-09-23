'use client';

import { useEffect, useState } from 'react';

import { Alert, Badge, Card, Skeleton } from '@liguita/ui';

import { listAdminMatches } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminMatchesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; status: string; score: number; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!authLoading && user) listAdminMatches().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Correspondances</h1>{error ? <Alert tone="danger" title={error} /> : null}<div className="space-y-2">{items.map((item) => <Card key={item.id}><div className="flex items-center justify-between gap-3"><div><p className="font-display font-bold text-ink-950">{item.id.slice(0, 8)}</p><p className="text-caption text-ink-500">{item.createdAt.slice(0, 10)}</p></div><div className="text-right"><Badge tone="neutral">{item.status}</Badge><p className="mt-1 text-caption text-ink-500">Score {item.score}</p></div></div></Card>)}</div></div>;
}
