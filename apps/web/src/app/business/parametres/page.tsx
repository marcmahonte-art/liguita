'use client';

import { useEffect, useState } from 'react';

import { Alert, Card, Skeleton } from '@liguita/ui';

import { getBusinessDashboard, type BusinessDashboard } from '../../actions/business';
import { useAuth } from '../../../lib/auth/auth-context';

export default function BusinessSettingsPage() {
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
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Paramètres</h1>
      <Card>
        <dl className="space-y-3 text-body-sm">
          <div>
            <dt className="text-caption text-ink-500">Organisation</dt>
            <dd className="font-bold text-ink-900">{dashboard.organization.name}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-500">Secteur</dt>
            <dd className="text-ink-800">{dashboard.organization.sector ?? 'Non renseigné'}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-500">Rôle actuel</dt>
            <dd className="text-ink-800">{dashboard.membership.role}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
