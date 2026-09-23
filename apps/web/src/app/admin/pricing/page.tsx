'use client';

import { useEffect, useState, useTransition } from 'react';

import { Alert, Card, Input, Skeleton } from '@liguita/ui';

import { listAdminPricingRules, publishAdminPricingRule } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminPricingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [versions, setVersions] = useState<Array<{ id: string; version: number; isActive: boolean; createdAt: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fees, setFees] = useState({ C1: 300, C2: 700, C3: 1200, C4: 3000 });
  const [rewards, setRewards] = useState({ C1: 100, C2: 250, C3: 400, C4: 900 });
  const [c5Rate, setC5Rate] = useState(1);
  const [vatRate, setVatRate] = useState(18);
  const [isPending, startTransition] = useTransition();
  useEffect(() => { if (!authLoading && user) listAdminPricingRules().then((result) => { setVersions(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  function publish() { startTransition(async () => { const result = await publishAdminPricingRule({ fees, rewards, c5: { rate: c5Rate / 100, floor: 5000, ceiling: 25000, rewardRate: 0.3 }, options: { urgentRate: 0.5, conciergerieFee: 1000, deliveryFee: 2500, deliveryIsProxy: true }, tax: { vatRate: vatRate / 100, commissionIsHt: true }, thresholds: { C5: 1000000 }, valueBands: [{ upTo: 60000, pricingClass: 'C1' }, { upTo: 100000, pricingClass: 'C2' }, { upTo: 300000, pricingClass: 'C3' }, { upTo: null, pricingClass: 'C4' }] }); if (result.error) setError(result.error); else { setMessage('Nouvelle version publiée.'); const refresh = await listAdminPricingRules(); setVersions(refresh.items); } }); }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><h1 className="font-display text-2xl font-extrabold text-ink-950">Tarification</h1>{error ? <Alert tone="danger" title={error} /> : null}{message ? <Alert tone="success" title={message} /> : null}<Card><h2 className="font-display text-body-lg font-bold text-ink-950">Publier une nouvelle version</h2><div className="mt-4 grid gap-3 sm:grid-cols-4">{(['C1', 'C2', 'C3', 'C4'] as const).map((key) => <Input key={`fee-${key}`} label={`Frais ${key}`} type="number" value={fees[key]} onChange={(event) => setFees((current) => ({ ...current, [key]: Number(event.target.value) }))} />)}{(['C1', 'C2', 'C3', 'C4'] as const).map((key) => <Input key={`reward-${key}`} label={`Récompense ${key}`} type="number" value={rewards[key]} onChange={(event) => setRewards((current) => ({ ...current, [key]: Number(event.target.value) }))} />)}<Input label="C5 (%)" type="number" step="0.1" value={c5Rate} onChange={(event) => setC5Rate(Number(event.target.value))} /><Input label="TVA (%)" type="number" step="0.1" value={vatRate} onChange={(event) => setVatRate(Number(event.target.value))} /></div><button type="button" disabled={isPending} onClick={publish} className="mt-4 rounded-lg bg-brand-700 px-4 py-3 font-display text-sm font-bold text-white disabled:opacity-50">Publier la version</button></Card><Card><h2 className="font-display text-body-lg font-bold text-ink-950">Versions</h2><div className="mt-3 space-y-2">{versions.map((version) => <div key={version.id} className="flex justify-between rounded-lg bg-ink-50 p-3 text-body-sm"><span>Version {version.version}</span><span>{version.isActive ? 'Active' : 'Archivée'} · {version.createdAt.slice(0, 10)}</span></div>)}</div></Card></div>;
}
