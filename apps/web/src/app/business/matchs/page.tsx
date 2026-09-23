'use client';

import { useEffect, useState } from 'react';

import { Alert, Card, Skeleton } from '@liguita/ui';

import { getBusinessDashboard, type BusinessDashboard } from '../../actions/business';
import { useAuth } from '../../../lib/auth/auth-context';

export default function BusinessMatchesPage() {
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
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Correspondances</h1>
      <Card>
        <p className="font-display text-3xl font-extrabold text-ink-950">
          {dashboard.counts.matches}
        </p>
        <p className="mt-1 text-body-sm text-ink-600">correspondances visibles sur vos sites.</p>
      </Card>
    </div>
  );
}
