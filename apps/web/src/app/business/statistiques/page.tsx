'use client';

import { useEffect, useState } from 'react';

import { Alert, Card, Skeleton } from '@liguita/ui';

import { getBusinessDashboard, type BusinessDashboard } from '../../actions/business';
import { useAuth } from '../../../lib/auth/auth-context';

export default function BusinessStatsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!authLoading && user)
      getBusinessDashboard().then((result) => {
        setDashboard(result.dashboard);
        setError(result.error ?? null);
      });
  }, [authLoading, user]);
  if (authLoading) return <Skeleton variant="rect" className="h-64 w-full" />;
  if (!dashboard) return <Alert tone="danger" title={error ?? 'Organisation indisponible.'} />;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Statistiques</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-caption text-ink-500">Objets</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{dashboard.counts.total}</p>
        </Card>
        <Card>
          <p className="text-caption text-ink-500">En attente</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{dashboard.counts.pending}</p>
        </Card>
        <Card>
          <p className="text-caption text-ink-500">Restitués</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{dashboard.counts.returned}</p>
        </Card>
      </div>
    </div>
  );
}
