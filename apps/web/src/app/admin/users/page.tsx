'use client';

import { useEffect, useState } from 'react';

import { Alert, Card, Skeleton } from '@liguita/ui';

import { listAdminUsers } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; displayName: string | null; phone: string; appRole: string; isBlocked: boolean; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!authLoading && user) listAdminUsers().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Utilisateurs</h1>{error ? <Alert tone="danger" title={error} /> : null}<div className="space-y-2">{items.map((item) => <Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display font-bold text-ink-950">{item.displayName ?? 'Utilisateur'}</p><p className="text-caption text-ink-500">{item.phone}</p></div><span className="text-caption font-bold text-ink-600">{item.appRole}{item.isBlocked ? ' · bloqué' : ''}</span></div></Card>)}</div></div>;
}
