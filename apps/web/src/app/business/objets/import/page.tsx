'use client';

import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { Alert, buttonClasses, Input, Skeleton } from '@liguita/ui';

import {
  getBusinessDashboard,
  importBusinessInventoryCsv,
  type BusinessDashboard,
} from '../../../actions/business';
import { useAuth } from '../../../../lib/auth/auth-context';

export default function BusinessImportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [locationId, setLocationId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!authLoading && user)
      getBusinessDashboard().then((result) => {
        setDashboard(result.dashboard);
        setError(result.error ?? null);
        setLocationId(
          result.dashboard?.membership.locationId ?? result.dashboard?.locations[0]?.id ?? '',
        );
      });
  }, [authLoading, user]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard || !file) return;
    startTransition(async () => {
      const text = await file.text();
      const result = await importBusinessInventoryCsv(dashboard.organization.id, locationId, text);
      if (result.errors.length) setError(result.errors.join(' '));
      else setError(null);
      setSuccess(`${result.imported} objet(s) importé(s).`);
    });
  }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  if (!dashboard) return <Alert tone="danger" title={error ?? 'Organisation indisponible.'} />;
  return (
    <div className="space-y-6">
      <Link href="/business/objets" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft size={16} /> Inventaire
      </Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950">
          Importer un inventaire CSV
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Maximum 100 lignes et 1 Mo. Les colonnes obligatoires : <code>title</code>,{' '}
          <code>categoryCode</code>, <code>itemTypeCode</code>, <code>citySlug</code>,{' '}
          <code>placeLabel</code>.
        </p>
      </div>
      {error ? <Alert tone="danger" title={error} /> : null}
      {success ? <Alert tone="success" title={success} /> : null}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Site"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            required
          />
          <label className="flex flex-col gap-2">
            <span className="text-caption font-bold text-ink-700">Fichier CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="h-[52px] rounded-lg border border-ink-400 px-3 file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-bold file:text-brand-700"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isPending || !file || !locationId}
          className={buttonClasses({ variant: 'primary' })}
        >
          <Upload size={16} /> Importer
        </button>
      </form>
    </div>
  );
}
