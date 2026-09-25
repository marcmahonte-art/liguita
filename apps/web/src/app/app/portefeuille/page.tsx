'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatMoney } from '@liguita/core/pricing';
import { Alert, Badge, buttonClasses, Card, Input, Skeleton } from '@liguita/ui';

import { getWallet, requestAirtelWithdrawal, type WalletSummary } from '../../actions/wallet';
import { formatShortDate } from '../../../lib/format';

const EMPTY_WALLET: WalletSummary = {
  availableBalance: 0,
  pendingBalance: 0,
  currency: 'XAF',
  entries: [],
  withdrawals: [],
};

const SOURCE_LABELS: Record<string, string> = {
  REWARD: 'Recompense objet trouvé',
  REWARD_RELEASE: 'Recompense disponible',
  WITHDRAWAL: 'Retrait Airtel Money',
};

export default function PortefeuillePage() {
  const [wallet, setWallet] = useState<WalletSummary>(EMPTY_WALLET);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('2500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idempotencyKey = useRef<string>('');

  const load = useCallback(async () => {
    const result = await getWallet();
    if (result.error) setError(result.error);
    else {
      setError(null);
      setWallet(result.wallet);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleWithdraw() {
    if (isSubmitting) return;
    if (!idempotencyKey.current) idempotencyKey.current = `withdrawal-${crypto.randomUUID()}`;
    setIsSubmitting(true);
    setMessage(null);
    const result = await requestAirtelWithdrawal(Number(amount), idempotencyKey.current);
    if (!result.ok) {
      setError(result.error ?? 'Demande impossible.');
    } else {
      setMessage('Demande enregistrée. Le retrait sera traité sous un jour ouvré.');
      idempotencyKey.current = '';
      await load();
    }
    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-12 w-64" />
        <Skeleton variant="rect" className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Mon portefeuille
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Vos récompenses, paiements et retraits Airtel Money au même endroit.
        </p>
      </div>

      {error ? <Alert tone="danger" title="Portefeuille" action={<button type="button" onClick={() => void load()} className="text-caption font-bold underline">Réessayer</button>}>{error}</Alert> : null}
      {message ? <Alert tone="success" title={message} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-caption font-bold uppercase tracking-wide text-ink-500">Solde disponible</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink-950">{formatMoney(wallet.availableBalance)}</p>
          <p className="mt-1 text-caption text-ink-500">Retrait minimum : 2 500 XAF</p>
        </Card>
        <Card>
          <p className="text-caption font-bold uppercase tracking-wide text-ink-500">En attente de restitution</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink-950">{formatMoney(wallet.pendingBalance)}</p>
          <p className="mt-1 text-caption text-ink-500">Disponible après confirmation de la restitution</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-body-lg font-bold text-ink-950">Retirer vers Airtel Money</h2>
            <p className="mt-1 text-body-sm text-ink-600">
              La demande est enregistrée avec une échéance d’un jour ouvré maximum.
            </p>
          </div>
          <Badge tone="pending">Airtel Money</Badge>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Montant à retirer (XAF)"
            type="number"
            min={2500}
            step={100}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={isSubmitting || wallet.availableBalance < 2500 || Number(amount) < 2500}
            className={buttonClasses({ variant: 'primary', size: 'lg' })}
          >
            {isSubmitting ? 'Enregistrement…' : 'Demander le retrait'}
          </button>
        </div>
        <p className="mt-3 text-caption text-ink-500">
          Le numéro Airtel Money vérifié de votre profil sera utilisé comme destination.
        </p>
      </Card>

      {wallet.withdrawals.length > 0 ? (
        <Card>
          <h2 className="font-display text-body-lg font-bold text-ink-950">Demandes de retrait</h2>
          <ul className="mt-3 divide-y divide-ink-100">
            {wallet.withdrawals.map((withdrawal) => (
              <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-900">{formatMoney(withdrawal.amount)}</p>
                  <p className="text-caption text-ink-500">Vers {withdrawal.destination} · demandé le {formatShortDate(withdrawal.requestedAt)}</p>
                </div>
                <div className="text-right">
                  <Badge tone={withdrawal.status === 'PAID' ? 'found' : 'pending'}>{withdrawal.status}</Badge>
                  <p className="mt-1 text-2xs text-ink-500">Échéance {formatShortDate(withdrawal.slaDueAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-display text-body-lg font-bold text-ink-950">Dernières transactions</h2>
        {wallet.entries.length === 0 ? (
          <p className="mt-3 text-body-sm text-ink-600">Aucune transaction pour le moment.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {wallet.entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-body-sm font-semibold text-ink-900">{SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}</p>
                  <p className="text-caption text-ink-500">{formatShortDate(entry.createdAt)}</p>
                </div>
                <p className={entry.direction === 'CREDIT' ? 'font-bold text-success-700' : 'font-bold text-danger-700'}>
                  {entry.direction === 'CREDIT' ? '+' : '−'} {formatMoney(entry.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
