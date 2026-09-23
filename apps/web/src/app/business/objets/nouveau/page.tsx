'use client';

import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { Alert, buttonClasses, Input, Select, Skeleton } from '@liguita/ui';

import {
  createBusinessInventoryItem,
  getBusinessDashboard,
  type BusinessDashboard,
} from '../../../actions/business';
import { useAuth } from '../../../../lib/auth/auth-context';

export default function NewBusinessObjectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [locationId, setLocationId] = useState('');
  const [form, setForm] = useState({
    categoryCode: '',
    itemTypeCode: '',
    title: '',
    citySlug: 'ndjamena',
    placeLabel: '',
    description: '',
    building: '',
    floor: '',
    storageZone: '',
    cabinet: '',
    locker: '',
    internalRef: '',
    internalNotes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (authLoading || !user) return;
    getBusinessDashboard().then((result) => {
      if (result.error) setError(result.error);
      setDashboard(result.dashboard);
      setLocationId(
        result.dashboard?.membership.locationId ?? result.dashboard?.locations[0]?.id ?? '',
      );
    });
  }, [authLoading, user]);

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard) return;
    startTransition(async () => {
      const result = await createBusinessInventoryItem({
        organizationId: dashboard.organization.id,
        locationId,
        ...form,
      });
      if (result.error) setError(result.error);
      else window.location.href = '/business/objets';
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
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Ajouter un objet
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Le matching est déclenché automatiquement après l’enregistrement.
        </p>
      </div>
      {error ? <Alert tone="danger" title={error} /> : null}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-ink-200 bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Site"
            required
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            options={dashboard.locations.map((location) => ({
              value: location.id,
              label: location.name,
            }))}
          />
          <Input
            label="Code catégorie"
            required
            value={form.categoryCode}
            onChange={(event) => update('categoryCode', event.target.value)}
            placeholder="doc-national-id"
          />
          <Input
            label="Code type"
            required
            value={form.itemTypeCode}
            onChange={(event) => update('itemTypeCode', event.target.value)}
            placeholder="national-id-card"
          />
          <Input
            label="Titre"
            required
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
          />
          <Input
            label="Ville"
            required
            value={form.citySlug}
            onChange={(event) => update('citySlug', event.target.value)}
          />
          <Input
            label="Lieu"
            required
            value={form.placeLabel}
            onChange={(event) => update('placeLabel', event.target.value)}
          />
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-caption font-bold text-ink-700">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            className="min-h-24 rounded-lg border border-ink-400 px-4 py-3 font-body text-body focus:border-ink-900 focus:outline-none"
          />
        </label>
        <fieldset className="space-y-3">
          <legend className="font-display font-bold text-ink-950">Localisation physique</legend>
          <div className="grid gap-3 sm:grid-cols-5">
            <Input
              label="Bâtiment"
              value={form.building}
              onChange={(event) => update('building', event.target.value)}
            />
            <Input
              label="Étage"
              value={form.floor}
              onChange={(event) => update('floor', event.target.value)}
            />
            <Input
              label="Zone"
              value={form.storageZone}
              onChange={(event) => update('storageZone', event.target.value)}
            />
            <Input
              label="Armoire"
              value={form.cabinet}
              onChange={(event) => update('cabinet', event.target.value)}
            />
            <Input
              label="Casier"
              value={form.locker}
              onChange={(event) => update('locker', event.target.value)}
            />
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-display font-bold text-ink-950">Références internes</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Référence interne"
              value={form.internalRef}
              onChange={(event) => update('internalRef', event.target.value)}
            />
            <Input
              label="Notes internes"
              value={form.internalNotes}
              onChange={(event) => update('internalNotes', event.target.value)}
            />
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={isPending || !locationId}
          className={buttonClasses({ variant: 'primary', block: true })}
        >
          <Save size={16} /> Enregistrer l’objet
        </button>
      </form>
    </div>
  );
}
