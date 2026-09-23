'use client';

import { Package, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { Alert, Badge, buttonClasses, EmptyState, Input, Select, Skeleton } from '@liguita/ui';

import {
  getBusinessDashboard,
  listBusinessInventory,
  type BusinessDashboard,
  type BusinessInventoryItem,
} from '../../actions/business';
import { useAuth } from '../../../lib/auth/auth-context';

const STATUS_LABEL: Record<string, string> = {
  FOUND: 'Trouvé',
  IN_INVENTORY: 'En inventaire',
  MATCH_POSSIBLE: 'Correspondance possible',
  OWNER_IDENTIFIED: 'Propriétaire identifié',
  RETURN_IN_PROGRESS: 'Restitution en cours',
  RETURNED: 'Restitué',
  ARCHIVED: 'Archivé',
};

export default function BusinessObjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [items, setItems] = useState<BusinessInventoryItem[]>([]);
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (authLoading || !user) return;
    getBusinessDashboard().then((result) => {
      if (result.error) setError(result.error);
      setDashboard(result.dashboard);
      setLocationId(result.dashboard?.membership.locationId ?? '');
      setIsLoading(false);
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (!dashboard) return;
    startTransition(async () => {
      const result = await listBusinessInventory(
        dashboard.organization.id,
        locationId || undefined,
        status || undefined,
        search,
      );
      if (result.error) setError(result.error);
      else setItems(result.items);
    });
  }, [dashboard, locationId, search, status]);

  if (isLoading || authLoading)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-48" />
        <Skeleton variant="rect" className="h-64 w-full" />
      </div>
    );

  if (!dashboard) return <Alert tone="danger" title={error ?? 'Aucune organisation Business.'} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Inventaire
          </h1>
          <p className="mt-1 text-body text-ink-600">
            Objets déclarés par {dashboard.organization.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/business/objets/import"
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Importer CSV
          </Link>
          <Link href="/business/objets/nouveau" className={buttonClasses({ variant: 'primary' })}>
            <Plus size={16} /> Ajouter
          </Link>
        </div>
      </header>
      {error ? <Alert tone="danger" title={error} /> : null}
      <div className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-4 sm:grid-cols-3">
        <Input
          label="Rechercher"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Titre de l’objet"
        />
        <Select
          label="Site"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          options={[
            { value: '', label: 'Tous mes sites' },
            ...dashboard.locations.map((location) => ({
              value: location.id,
              label: location.name,
            })),
          ]}
        />
        <Select
          label="Statut"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: 'Tous les statuts' },
            ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
      {isPending ? (
        <Skeleton variant="rect" className="h-32 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun objet"
          description="Ajoutez votre premier objet à cet établissement."
          action={
            <Link href="/business/objets/nouveau" className={buttonClasses({ variant: 'primary' })}>
              Ajouter un objet
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/business/objets/${item.id}`}
                className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-caption font-bold text-ink-500">
                    <Package size={16} /> {item.publicRef ?? 'Sans référence'}
                  </span>
                  <Badge tone={item.status === 'RETURNED' ? 'found' : 'pending'}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                </div>
                <h2 className="mt-3 font-display text-body-lg font-bold text-ink-950">
                  {item.title}
                </h2>
                <p className="mt-1 text-body-sm text-ink-600">
                  {item.locationName ?? 'Site non défini'} · {item.placeLabel}
                </p>
                <p className="mt-3 text-caption text-ink-500">
                  {item.building ?? 'Bâtiment non renseigné'} · Étage {item.floor ?? '—'} · Zone{' '}
                  {item.storageZone ?? '—'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 text-caption text-ink-500">
        <Search size={14} /> Les filtres et compteurs sont appliqués côté serveur selon votre rôle
        et vos sites.
      </p>
    </div>
  );
}
