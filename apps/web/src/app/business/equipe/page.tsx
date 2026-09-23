'use client';

import { Copy, UserPlus } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { Alert, buttonClasses, Card, Input, Select, Skeleton } from '@liguita/ui';

import {
  getBusinessDashboard,
  inviteBusinessMember,
  type BusinessDashboard,
} from '../../actions/business';
import { useAuth } from '../../../lib/auth/auth-context';

export default function BusinessTeamPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'AGENT' | 'READONLY'>('AGENT');
  const [locationId, setLocationId] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  useEffect(() => {
    if (!authLoading && user)
      getBusinessDashboard().then((result) => {
        setError(result.error ?? null);
        setDashboard(result.dashboard);
        setLocationId(result.dashboard?.membership.locationId ?? '');
      });
  }, [authLoading, user]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard) return;
    startTransition(async () => {
      const result = await inviteBusinessMember(
        dashboard.organization.id,
        email,
        role,
        locationId || undefined,
      );
      if (result.error) setError(result.error);
      else {
        setToken(result.token ?? null);
        setEmail('');
      }
    });
  }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  if (!dashboard) return <Alert tone="danger" title={error ?? 'Organisation indisponible.'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">Équipe</h1>
        <p className="mt-1 text-body text-ink-600">
          Invitez des membres et limitez leur périmètre aux sites autorisés.
        </p>
      </div>
      {error ? <Alert tone="danger" title={error} /> : null}
      <Card>
        <div className="flex items-center gap-2">
          <UserPlus className="text-brand-700" />
          <h2 className="font-display text-body-lg font-bold text-ink-950">Inviter un membre</h2>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="E-mail"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Select
              label="Rôle"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
              options={[
                { value: 'ADMIN', label: 'Administrateur' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'AGENT', label: 'Agent' },
                { value: 'READONLY', label: 'Lecture seule' },
              ]}
            />
            <Select
              label="Site"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              options={[
                { value: '', label: 'Tous les sites' },
                ...dashboard.locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                })),
              ]}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={buttonClasses({ variant: 'primary' })}
          >
            Envoyer l’invitation
          </button>
        </form>
        {token ? (
          <div className="mt-4 rounded-xl bg-success-50 p-3 text-body-sm text-success-800">
            <p>Invitation créée. Partagez ce lien d’acceptation :</p>
            <code className="mt-2 block break-all">{`${origin}/invitation/${token}`}</code>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-caption font-bold"
              onClick={() => void navigator.clipboard.writeText(`${origin}/invitation/${token}`)}
            >
              <Copy size={13} /> Copier
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
