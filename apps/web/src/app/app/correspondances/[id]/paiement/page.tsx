'use client';

import { LockKeyhole, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { Alert, Badge, buttonClasses, Input, Select, Skeleton } from '@liguita/ui';
import { formatMoney } from '@liguita/core/pricing';
import { PriceQuoteCard } from '@liguita/ui';

import {
  createPriceQuote,
  getPaymentState,
  initiatePayment,
  type PriceQuoteView,
} from '../../../../actions/payments';
import { useAuth } from '../../../../../lib/auth/auth-context';

export default function PaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [quote, setQuote] = useState<PriceQuoteView | null>(null);
  const [options, setOptions] = useState<Record<'URGENT' | 'CONCIERGERIE' | 'DELIVERY', boolean>>({
    URGENT: false,
    CONCIERGERIE: false,
    DELIVERY: false,
  });
  const [communityBonus, setCommunityBonus] = useState('0');
  const [provider, setProvider] = useState<'CASH' | 'AIRTEL' | 'MOOV'>('AIRTEL');
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<{
    status: 'UNPAID' | 'PENDING' | 'PAID' | 'REFUNDED';
    conversationId: string | null;
    transactionId: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const idempotencyKey = useRef('');

  const matchId = params.id;

  useEffect(() => {
    if (authLoading || !user || !matchId) return;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    let cancelled = false;
    void createPriceQuote(matchId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else setQuote(result.quote);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, matchId, user]);

  useEffect(() => {
    if (authLoading || !user || !matchId) return;
    let cancelled = false;
    const poll = async () => {
      const result = await getPaymentState(matchId);
      if (!cancelled) setPaymentState(result);
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authLoading, matchId, user]);

  function refreshQuote() {
    if (!matchId) return;
    startTransition(async () => {
      const selected = Object.entries(options)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      const result = await createPriceQuote(
        matchId,
        selected,
        Number(communityBonus) || 0,
        quote?.id,
      );
      if (result.error) setError(result.error);
      else {
        setQuote(result.quote);
        setError(null);
        idempotencyKey.current = crypto.randomUUID();
      }
    });
  }

  function handlePay() {
    if (!quote || isPending) return;
    startTransition(async () => {
      const result = await initiatePayment(quote.id, idempotencyKey.current, provider);
      if (!result.ok) {
        setError(result.error ?? 'Paiement impossible.');
        return;
      }
      if (result.conversationId) {
        router.push(`/app/messages/${result.conversationId}`);
        return;
      }
      if (result.status === 'PENDING') {
        setPaymentState({
          status: 'PENDING',
          conversationId: result.conversationId ?? null,
          transactionId: result.transactionId ?? null,
        });
        setError('Vérification en cours. Ne relancez pas le paiement.');
        return;
      }
      setError('Paiement confirmé.');
    });
  }

  if (isLoading || authLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-48" />
        <Skeleton variant="rect" className="h-96 w-full" />
      </div>
    );
  }

  const paymentChecking = paymentState?.status === 'PENDING';
  const paymentCompleted = paymentState?.status === 'PAID';

  return (
    <div className="space-y-6">
      <Link
        href={`/app/correspondances/${matchId}`}
        className={buttonClasses({ variant: 'ghost', size: 'sm' })}
      >
        Retour à la correspondance
      </Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Finaliser la mise en relation
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Le devis est calculé côté serveur et reste valable 30 minutes.
        </p>
      </div>
      {error ? (
        <Alert
          tone={paymentChecking || error.includes('Vérification') ? 'warning' : 'danger'}
          title={error}
        />
      ) : null}

      {quote ? (
        <>
          <PriceQuoteCard quote={quote.breakdown} title="Votre devis Liguita" />
          <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
            <div>
              <h2 className="font-display text-body-lg font-bold text-ink-950">Options</h2>
              <p className="mt-1 text-body-sm text-ink-600">
                Chaque changement recalcule le devis côté serveur.
              </p>
            </div>
            <div className="space-y-3">
              {(['URGENT', 'CONCIERGERIE', 'DELIVERY'] as const).map((option) => {
                const labels = {
                  URGENT: 'Traitement urgent (+50 %)',
                  CONCIERGERIE: 'Conciergerie documents (+1 000 FCFA)',
                  DELIVERY: 'Livraison partenaire',
                };
                 const disabled = option === 'DELIVERY';
                 return (
                   <label
                    key={option}
                    className="flex min-h-12 items-center gap-3 text-body-sm text-ink-800"
                  >
                    <input
                      type="checkbox"
                      checked={options[option]}
                      disabled={disabled || isPending}
                      onChange={(event) =>
                        setOptions((current) => ({ ...current, [option]: event.target.checked }))
                      }
                      className="h-5 w-5 accent-brand-700"
                    />
                    <span>{labels[option]}</span>
                    {disabled ? <Badge tone="neutral">Bientôt</Badge> : null}
                  </label>
                );
              })}
            </div>
            <Input
              label="Bonus communautaire facultatif"
              type="number"
              min={0}
              step={100}
              value={communityBonus}
              onChange={(event) => setCommunityBonus(event.target.value)}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={refreshQuote}
              disabled={isPending}
              className={buttonClasses({ variant: 'outline' })}
            >
              Recalculer le devis
            </button>
          </section>

          <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="font-display text-body-lg font-bold text-ink-950">Moyen de paiement</h2>
            <Select
              label="Opérateur"
              value={provider}
              onChange={(event) => setProvider(event.target.value as typeof provider)}
              options={[
                { value: 'CASH', label: 'Espèces Liguita (test)' },
                { value: 'AIRTEL', label: 'Airtel Money' },
                { value: 'MOOV', label: 'Moov Money' },
              ]}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={handlePay}
              disabled={isPending || paymentChecking || paymentCompleted}
              className={buttonClasses({ variant: 'primary', block: true })}
            >
              <LockKeyhole size={16} />
              {paymentCompleted
                ? 'Paiement confirmé'
                : paymentChecking
                  ? 'Vérification en cours'
                  : `Payer ${formatMoney(quote.totalAmount)}`}
            </button>
            <p className="text-center text-2xs text-ink-500">
              Un double clic ne crée qu’une transaction.
            </p>
          </section>
        </>
      ) : (
        <Alert tone="danger" title="Devis indisponible." />
      )}

      <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
        <h2 className="flex items-center gap-2 font-display text-body-lg font-bold text-ink-950">
          <ShieldCheck size={18} className="text-brand-700" /> Après paiement
        </h2>
        <p className="mt-2 text-body-sm text-ink-700">
          La conversation sécurisée et la réservation de la récompense sont créées automatiquement
          après confirmation opérateur.
        </p>
        <p className="mt-2 text-body-sm text-ink-700">
          Remboursement intégral disponible sous 7 jours sans mise en relation effective.
        </p>
      </section>
    </div>
  );
}
