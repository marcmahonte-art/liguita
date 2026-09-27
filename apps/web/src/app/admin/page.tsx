'use client';

import {
  AlertTriangle,
  ArrowUpFromLine,
  Banknote,
  Flag,
  Package,
  ReceiptText,
  ShieldAlert,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatMoney } from '@liguita/core/pricing';
import { Alert, Badge, Card, Skeleton } from '@liguita/ui';

import { getAdminOverview } from '../actions/admin';
import { getAdminFinanceOverview, type AdminFinanceOverview } from '../actions/admin-finance';
import { AdminPageHeader, AdminStatCard } from '../../components/admin/AdminPageHeader';
import { useAuth } from '../../lib/auth/auth-context';
import { formatShortDate } from '../../lib/format';

interface PlatformOverview {
  users: number;
  objects: number;
  matches: number;
  transactions: number;
  reports: number;
  fraudCases: number;
  auditEvents: number;
}

const SHORTCUTS = [
  { href: '/admin/retraits', label: 'Retraits', icon: ArrowUpFromLine },
  { href: '/admin/tresorerie', label: 'Trésorerie', icon: Banknote },
  { href: '/admin/paiements', label: 'Paiements', icon: ReceiptText },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/objets', label: 'Objets', icon: Package },
  { href: '/admin/reports', label: 'Signalements', icon: Flag },
  { href: '/admin/fraud', label: 'Fraudes', icon: ShieldAlert },
];

/**
 * Vue d'ensemble de la console.
 *
 * ⚠️ **L'ordre des blocs suit l'urgence, pas la logique comptable.** Ce qui
 * demande une action est en tête : un retrait hors délai, une notification non
 * traitée. Les volumes de la plateforme viennent ensuite — ils informent, ils
 * n'appellent rien.
 */
export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [platform, setPlatform] = useState<PlatformOverview | null>(null);
  const [finance, setFinance] = useState<AdminFinanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    void Promise.all([getAdminOverview(), getAdminFinanceOverview()]).then(
      ([platformResult, financeResult]) => {
        setPlatform(platformResult.data ?? null);
        setFinance(financeResult.data ?? null);
        setError(platformResult.error ?? financeResult.error ?? null);
      },
    );
  }, [authLoading, user]);

  if (authLoading || (!platform && !error)) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} variant="rect" className="h-28 w-full" />
          ))}
        </div>
        <Skeleton variant="rect" className="h-40 w-full" />
      </div>
    );
  }

  if (error && !platform) return <Alert tone="danger" title={error} />;

  const withdrawals = finance?.withdrawals;
  const needsAttention = (withdrawals?.requestedCount ?? 0) + (withdrawals?.overdueCount ?? 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        overline="Administration"
        title="Vue d’ensemble"
        description="Pilotage de la plateforme Liguita."
      />

      {/* ---------- Ce qui demande une action ---------- */}
      {needsAttention > 0 ? (
        <Alert
          tone={withdrawals?.overdueCount ? 'warning' : 'info'}
          title={
            withdrawals?.overdueCount
              ? `${withdrawals.overdueCount} retrait(s) hors délai`
              : `${withdrawals?.requestedCount} retrait(s) à traiter`
          }
        >
          {withdrawals?.oldestWaitingAt
            ? `La plus ancienne demande date du ${formatShortDate(withdrawals.oldestWaitingAt)}. `
            : ''}
          <Link href="/admin/retraits" className="font-bold underline">
            Ouvrir la file des retraits
          </Link>
          .
        </Alert>
      ) : null}

      {(finance?.paymentHealth.enquiryUnknown ?? 0) > 0 ? (
        <Alert tone="warning" title="Rapprochement de paiement bloqué">
          {finance?.paymentHealth.enquiryUnknown} transaction(s) sans confirmation de l’opérateur.{' '}
          <Link href="/admin/paiements" className="font-bold underline">
            Vérifier
          </Link>
          .
        </Alert>
      ) : null}

      {/* ---------- Finances ---------- */}
      <section aria-labelledby="finances-titre">
        <h2
          id="finances-titre"
          className="mb-3 font-display text-body-lg font-bold text-ink-900"
        >
          Finances
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            icon={<Banknote size={18} />}
            label="Encaissé (cumul)"
            value={formatMoney(finance?.deposits.paidAmount ?? 0)}
            hint={`${finance?.deposits.paidCount ?? 0} paiement(s)`}
            tone="found"
            href="/admin/tresorerie"
          />
          <AdminStatCard
            icon={<ArrowUpFromLine size={18} />}
            label="Retraits versés"
            value={formatMoney(withdrawals?.paidAmount ?? 0)}
            hint={`${withdrawals?.paidCount ?? 0} versement(s)`}
            href="/admin/retraits"
          />
          <AdminStatCard
            icon={<AlertTriangle size={18} />}
            label="À traiter"
            value={String(withdrawals?.requestedCount ?? 0)}
            hint={
              withdrawals?.overdueCount
                ? `dont ${withdrawals.overdueCount} hors délai`
                : 'dans les délais'
            }
            tone={withdrawals?.overdueCount ? 'lost' : 'neutral'}
            href="/admin/retraits"
          />
          <AdminStatCard
            icon={<ReceiptText size={18} />}
            label="Commission Liguita"
            value={formatMoney(finance?.commissions.totalCommission ?? 0)}
            hint={`dont TVA ${formatMoney(finance?.commissions.totalVat ?? 0)}`}
            href="/admin/tresorerie"
          />
        </div>
      </section>

      {/* ---------- Plateforme ---------- */}
      <section aria-labelledby="plateforme-titre">
        <h2
          id="plateforme-titre"
          className="mb-3 font-display text-body-lg font-bold text-ink-900"
        >
          Plateforme
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            icon={<Users size={18} />}
            label="Utilisateurs"
            value={String(platform?.users ?? 0)}
            href="/admin/users"
          />
          <AdminStatCard
            icon={<Package size={18} />}
            label="Objets trouvés"
            value={String(platform?.objects ?? 0)}
            href="/admin/objets"
          />
          <AdminStatCard
            icon={<Flag size={18} />}
            label="Signalements"
            value={String(platform?.reports ?? 0)}
            href="/admin/reports"
          />
          <AdminStatCard
            icon={<ShieldAlert size={18} />}
            label="Dossiers fraude"
            value={String(platform?.fraudCases ?? 0)}
            href="/admin/fraud"
          />
        </div>
      </section>

      {/* ---------- Raccourcis ---------- */}
      <Card>
        <h2 className="font-display text-h3 text-ink-900">Accès rapides</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-200 px-4 font-display text-body-sm font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <Icon size={16} aria-hidden />
                {shortcut.label}
              </Link>
            );
          })}
        </div>
      </Card>

      {finance?.wallets.pendingTotal ? (
        <p className="text-caption text-ink-500">
          <Badge tone="neutral">
            {formatMoney(finance.wallets.pendingTotal)} réservés
          </Badge>{' '}
          en attente d’être débloqués au profit des trouveurs.
        </p>
      ) : null}
    </div>
  );
}
