'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Clock,
  Landmark,
  Percent,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatMoney } from '@liguita/core/pricing';
import { Alert, Badge, Card, EmptyState, Skeleton, buttonClasses } from '@liguita/ui';

import {
  getAdminFinanceOverview,
  listAdminWallets,
  type AdminFinanceOverview,
  type AdminWalletRow,
} from '../../actions/admin-finance';
import { AdminPageHeader, AdminStatCard } from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';

/**
 * Trésorerie — la vue consolidée de l'argent qui entre et qui sort.
 *
 * ⚠️ **Deux flux, jamais confondus.** C'est la distinction structurante du modèle
 * Liguita, et l'écran est construit autour d'elle :
 *   · les **dépôts** — un chercheur paie Liguita pour obtenir un contact ;
 *   · les **retraits** — Liguita paie un trouveur qui a trouvé un objet.
 *
 * Un solde net unique serait plus flatteur mais faux : l'argent des retraits
 * n'appartient pas à Liguita (il est dû au trouveur), alors que la commission,
 * si. Les présenter dans le même total laisserait croire à une marge qui n'existe
 * pas. D'où deux blocs séparés, et une réconciliation explicite.
 */
export default function AdminTresoreriePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [overview, setOverview] = useState<AdminFinanceOverview | null>(null);
  const [wallets, setWallets] = useState<AdminWalletRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [overviewResult, walletsResult] = await Promise.all([
      getAdminFinanceOverview(),
      listAdminWallets(),
    ]);
    setOverview(overviewResult.data ?? null);
    setError(overviewResult.error ?? walletsResult.error ?? null);
    setWallets(walletsResult.items);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  if (authLoading || (!overview && !error)) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} variant="rect" className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !overview) return <Alert tone="danger" title={error} />;

  const deposits = overview?.deposits;
  const withdrawals = overview?.withdrawals;
  const commissions = overview?.commissions;
  const health = overview?.paymentHealth;

  /* Ce que Liguita doit aux trouveurs : les récompenses encaissées mais pas
     encore sorties. C'est une dette, pas un revenu — l'écran le dit. */
  const owedToFinders =
    (withdrawals?.requestedAmount ?? 0) +
    (withdrawals?.inFlightAmount ?? 0) +
    (overview?.wallets.pendingTotal ?? 0) +
    (overview?.wallets.availableTotal ?? 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        overline="Finances"
        title="Trésorerie"
        description="Dépôts encaissés, retraits versés, et ce que Liguita doit encore aux trouveurs."
        actions={
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              void load();
            }}
            disabled={isRefreshing}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <RefreshCw size={15} aria-hidden className={isRefreshing ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
        }
      />

      {/* Alerte en tête : un SLA dépassé est la seule chose de cet écran qui
          demande une action immédiate. Elle passe avant les chiffres. */}
      {(withdrawals?.overdueCount ?? 0) > 0 ? (
        <Alert tone="warning" title={`${withdrawals?.overdueCount} retrait(s) hors délai`}>
          Le délai annoncé aux trouveurs est dépassé.{' '}
          <Link href="/admin/retraits" className="font-bold underline">
            Traiter la file d’attente
          </Link>
          .
        </Alert>
      ) : null}

      {health && (health.enquiryUnknown > 0 || health.eventsUnprocessed > 0) ? (
        <Alert tone="warning" title="Rapprochement à surveiller">
          {health.enquiryUnknown > 0
            ? `${health.enquiryUnknown} rapprochement(s) sans réponse d’Airtel. `
            : ''}
          {health.eventsUnprocessed > 0
            ? `${health.eventsUnprocessed} notification(s) non traitée(s). `
            : ''}
          <Link href="/admin/paiements" className="font-bold underline">
            Voir les paiements
          </Link>
          .
        </Alert>
      ) : null}

      {/* ---------- Dépôts ---------- */}
      <section aria-labelledby="depots-titre">
        <h2
          id="depots-titre"
          className="mb-3 flex items-center gap-2 font-display text-body-lg font-bold text-ink-900"
        >
          <ArrowDownToLine size={18} className="text-success-700" aria-hidden />
          Dépôts encaissés
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            icon={<Banknote size={18} />}
            label="Encaissé (cumul)"
            value={formatMoney(deposits?.paidAmount ?? 0)}
            hint={`${deposits?.paidCount ?? 0} transaction(s) payée(s)`}
            tone="found"
          />
          <AdminStatCard
            icon={<Clock size={18} />}
            label="En attente"
            value={formatMoney(deposits?.pendingAmount ?? 0)}
            hint={`${deposits?.pendingCount ?? 0} en cours chez l’opérateur`}
          />
          <AdminStatCard
            icon={<ArrowDownToLine size={18} />}
            label="Aujourd’hui"
            value={formatMoney(deposits?.todayAmount ?? 0)}
            hint={`${deposits?.todayCount ?? 0} paiement(s)`}
            tone="found"
          />
          <AdminStatCard
            icon={<AlertTriangle size={18} />}
            label="Échecs et annulations"
            value={String(deposits?.failedCount ?? 0)}
            hint={`Remboursé : ${formatMoney(deposits?.refundedAmount ?? 0)}`}
          />
        </div>
      </section>

      {/* ---------- Retraits ---------- */}
      <section aria-labelledby="retraits-titre">
        <h2
          id="retraits-titre"
          className="mb-3 flex items-center gap-2 font-display text-body-lg font-bold text-ink-900"
        >
          <ArrowUpFromLine size={18} className="text-brand-700" aria-hidden />
          Retraits versés aux trouveurs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            icon={<Clock size={18} />}
            label="À traiter"
            value={String(withdrawals?.requestedCount ?? 0)}
            hint={`${formatMoney(withdrawals?.requestedAmount ?? 0)} demandés`}
            tone={withdrawals?.overdueCount ? 'lost' : 'neutral'}
          />
          <AdminStatCard
            icon={<ArrowUpFromLine size={18} />}
            label="Chez l’opérateur"
            value={String(withdrawals?.inFlightCount ?? 0)}
            hint={`${formatMoney(withdrawals?.inFlightAmount ?? 0)} en cours`}
          />
          <AdminStatCard
            icon={<Banknote size={18} />}
            label="Versé (cumul)"
            value={formatMoney(withdrawals?.paidAmount ?? 0)}
            hint={`${withdrawals?.paidCount ?? 0} retrait(s) payé(s)`}
            tone="found"
          />
          <AdminStatCard
            icon={<AlertTriangle size={18} />}
            label="Dettes envers les trouveurs"
            value={formatMoney(owedToFinders)}
            hint="Solde disponible + réservé + demandé"
          />
        </div>
      </section>

      {/* ---------- Répartition de ce qui a été encaissé ---------- */}
      <Card>
        <h2 className="flex items-center gap-2 font-display text-h3 text-ink-900">
          <Percent size={18} className="text-brand-700" aria-hidden />
          Répartition des encaissements
        </h2>
        <p className="mt-1 text-body-sm text-ink-500">
          Sur chaque paiement encaissé : ce qui revient au trouveur, ce qui reste à Liguita, et la
          TVA incluse dans la commission.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReconcileRow
            label="Récompenses des trouveurs"
            value={formatMoney(commissions?.totalRewards ?? 0)}
            note="Dû aux trouveurs"
          />
          <ReconcileRow
            label="Bonus communautaire"
            value={formatMoney(commissions?.totalBonus ?? 0)}
            note="100 % trouveur"
          />
          <ReconcileRow
            label="Frais de livraison"
            value={formatMoney(commissions?.totalDelivery ?? 0)}
            note="Reversés au livreur"
          />
          <ReconcileRow
            label="Commission Liguita"
            value={formatMoney(commissions?.totalCommission ?? 0)}
            note="dont TVA extraite"
            emphasis
          />
          <ReconcileRow
            label="dont TVA (18 %)"
            value={formatMoney(commissions?.totalVat ?? 0)}
            note="Extraite, non ajoutée"
          />
        </dl>
      </Card>

      {/* ---------- Portefeuilles ---------- */}
      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-6">
          <div>
            <h2 className="flex items-center gap-2 font-display text-h3 text-ink-900">
              <Wallet size={18} className="text-brand-700" aria-hidden />
              Portefeuilles des trouveurs
            </h2>
            <p className="mt-1 text-body-sm text-ink-500">
              {overview?.wallets.accountCount ?? 0} compte(s) ·{' '}
              {formatMoney(overview?.wallets.availableTotal ?? 0)} disponible
            </p>
          </div>
          <Link href="/admin/retraits" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            File des retraits
          </Link>
        </div>

        {wallets.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Aucun portefeuille"
              description="Les comptes apparaissent dès qu’un trouveur reçoit une première récompense."
              icon={<Landmark size={40} aria-hidden />}
            />
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {wallets.slice(0, 15).map((wallet) => (
              <div
                key={wallet.userId}
                className="flex flex-wrap items-center justify-between gap-3 p-4 px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-display font-bold text-ink-900">
                    {wallet.displayName}
                  </p>
                  <p className="truncate text-caption text-ink-500">
                    {wallet.email ?? 'Aucun email'}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="font-display font-bold text-ink-900">
                      {formatMoney(wallet.availableBalance)}
                    </p>
                    <p className="text-2xs uppercase tracking-wide text-ink-500">Disponible</p>
                  </div>
                  <div>
                    <p className="font-display font-bold text-ink-700">
                      {formatMoney(wallet.pendingBalance)}
                    </p>
                    <p className="text-2xs uppercase tracking-wide text-ink-500">Réservé</p>
                  </div>
                  <Badge tone={wallet.status === 'ACTIVE' ? 'found' : 'urgent'}>
                    {wallet.status === 'ACTIVE' ? 'Actif' : 'Gelé'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {overview ? (
        <p className="text-caption text-ink-500">
          Instantané du {formatShortDate(overview.at)} · {health?.events24h ?? 0} notification(s)
          d’opérateur sur 24 h
        </p>
      ) : null}
    </div>
  );
}

function ReconcileRow({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg bg-ink-50 p-4">
      <dt className="text-2xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd
        className={`mt-1 font-display font-extrabold ${emphasis ? 'text-brand-700' : 'text-ink-900'}`}
      >
        {value}
      </dd>
      <p className="mt-0.5 text-2xs text-ink-500">{note}</p>
    </div>
  );
}
