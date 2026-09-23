'use client';

import { useEffect, useState } from 'react';

import { Alert, Badge, Card, Skeleton } from '@liguita/ui';

import { listAdminObjects } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminObjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; title: string; status: string; citySlug: string; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!authLoading && user) listAdminObjects().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Objets</h1>{error ? <Alert tone="danger" title={error} /> : null}<div className="space-y-2">{items.map((item) => <Card key={item.id}><div className="flex items-center justify-between gap-3"><div><p className="font-display font-bold text-ink-950">{item.title}</p><p className="text-caption text-ink-500">{item.citySlug} · {item.createdAt.slice(0, 10)}</p></div><Badge tone="neutral">{item.status}</Badge></div></Card>)}</div></div>;
}
