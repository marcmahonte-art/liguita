'use client';

import { Building2, ClipboardList, Package, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { Alert, Badge, buttonClasses, Card, Input, Skeleton } from '@liguita/ui';

import {
  createOrganization,
  getBusinessDashboard,
  type BusinessDashboard,
} from '../actions/business';
import { useAuth } from '../../lib/auth/auth-context';

export default function BusinessDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [citySlug, setCitySlug] = useState('ndjamena');

  useEffect(() => {
    if (authLoading || !user) return;
    getBusinessDashboard().then((result) => {
      if (result.error && result.error !== 'Aucune organisation.') setError(result.error);
      setDashboard(result.dashboard);
      setIsLoading(false);
    });
  }, [authLoading, user]);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createOrganization(name, sector, citySlug);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  }

  if (isLoading || authLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-56" />
        <Skeleton variant="rect" className="h-64 w-full" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-950">
            Créer votre espace Business
          </h1>
          <p className="mt-1 text-body text-ink-600">
            Centralisez vos objets trouvés, vos sites et votre équipe.
          </p>
        </div>
        {error ? <Alert tone="danger" title={error} /> : null}
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5"
        >
          <Input
            label="Nom de l’organisation"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="Secteur"
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            placeholder="Aéroport, hôtel, commerce…"
          />
          <Input
            label="Code ville"
            value={citySlug}
            onChange={(event) => setCitySlug(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className={buttonClasses({ variant: 'primary', block: true })}
          >
            <Plus size={16} /> Créer l’organisation
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-caption font-bold uppercase tracking-wide text-brand-700">
            Console Business
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            {dashboard.organization.name}
          </h1>
          <p className="mt-1 text-body-sm text-ink-600">
            Rôle : {dashboard.membership.role} · {dashboard.locations.length} site(s)
          </p>
        </div>
        <Link href="/business/objets/nouveau" className={buttonClasses({ variant: 'primary' })}>
          <Plus size={16} /> Ajouter un objet
        </Link>
      </header>
      {error ? <Alert tone="danger" title={error} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <Package size={20} className="text-brand-700" />
            <span className="text-caption font-bold text-ink-500">Objets trouvés</span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink-950">
            {dashboard.counts.total}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <ClipboardList size={20} className="text-warning-600" />
            <span className="text-caption font-bold text-ink-500">En attente</span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink-950">
            {dashboard.counts.pending}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Users size={20} className="text-brand-700" />
            <span className="text-caption font-bold text-ink-500">Correspondances</span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink-950">
            {dashboard.counts.matches}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-success-700" />
            <span className="text-caption font-bold text-ink-500">Restitués</span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink-950">
            {dashboard.counts.returned}
          </p>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/business/objets"
          className="rounded-2xl border border-ink-200 bg-white p-5 hover:border-brand-300"
        >
          <Package className="text-brand-700" />
          <h2 className="mt-3 font-display text-body-lg font-bold text-ink-950">Inventaire</h2>
          <p className="mt-1 text-body-sm text-ink-600">
            Gérer les objets et leur emplacement physique.
          </p>
        </Link>
        <Link
          href="/business/sites"
          className="rounded-2xl border border-ink-200 bg-white p-5 hover:border-brand-300"
        >
          <Building2 className="text-brand-700" />
          <h2 className="mt-3 font-display text-body-lg font-bold text-ink-950">Établissements</h2>
          <p className="mt-1 text-body-sm text-ink-600">Gérer les sites et leurs informations.</p>
        </Link>
        <Link
          href="/business/equipe"
          className="rounded-2xl border border-ink-200 bg-white p-5 hover:border-brand-300"
        >
          <Users className="text-brand-700" />
          <h2 className="mt-3 font-display text-body-lg font-bold text-ink-950">Équipe</h2>
          <p className="mt-1 text-body-sm text-ink-600">
            Inviter des membres et définir leurs rôles.
          </p>
        </Link>
      </div>
      {dashboard.organization.isVerified ? (
        <Badge tone="found">Organisation vérifiée</Badge>
      ) : (
        <p className="text-caption text-ink-500">
          Votre organisation sera vérifiée par l’équipe Liguita.
        </p>
      )}
    </div>
  );
}
