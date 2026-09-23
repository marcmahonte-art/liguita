'use client';

import { Building2, Plus } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { Alert, buttonClasses, Card, Input, Skeleton } from '@liguita/ui';

import {
  createBusinessLocation,
  getBusinessDashboard,
  type BusinessDashboard,
} from '../../actions/business';
import { useAuth } from '../../../lib/auth/auth-context';

export default function BusinessSitesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [form, setForm] = useState({ name: '', citySlug: 'ndjamena', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!authLoading && user)
      getBusinessDashboard().then((result) => {
        setError(result.error ?? null);
        setDashboard(result.dashboard);
      });
  }, [authLoading, user]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard) return;
    startTransition(async () => {
      const result = await createBusinessLocation(
        dashboard.organization.id,
        form.name,
        form.citySlug,
        form.address,
      );
      if (result.error) setError(result.error);
      else setForm({ name: '', citySlug: 'ndjamena', address: '' });
    });
  }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  if (!dashboard) return <Alert tone="danger" title={error ?? 'Organisation indisponible.'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Établissements
        </h1>
        <p className="mt-1 text-body text-ink-600">Gérez les sites accessibles à votre équipe.</p>
      </div>
      {error ? <Alert tone="danger" title={error} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {dashboard.locations.map((location) => (
          <Card key={location.id}>
            <div className="flex items-start gap-3">
              <Building2 className="text-brand-700" />
              <div>
                <h2 className="font-display text-body-lg font-bold text-ink-950">
                  {location.name}
                </h2>
                <p className="mt-1 text-body-sm text-ink-600">
                  {location.citySlug.replace(/-/g, ' ')}
                  {location.address ? ` · ${location.address}` : ''}
                </p>
              </div>
            </div>
          </Card>
        ))}
        {dashboard.locations.length === 0 ? (
          <p className="text-body-sm text-ink-500">Aucun site.</p>
        ) : null}
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-display text-body-lg font-bold text-ink-950">
          <Plus size={17} /> Ajouter un établissement
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Nom"
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Code ville"
            required
            value={form.citySlug}
            onChange={(event) =>
              setForm((current) => ({ ...current, citySlug: event.target.value }))
            }
          />
          <Input
            label="Adresse"
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className={buttonClasses({ variant: 'primary' })}
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
