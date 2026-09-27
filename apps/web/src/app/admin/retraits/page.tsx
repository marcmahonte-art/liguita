'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { formatMoney } from '@liguita/core/pricing';
import { Alert, Badge, Card, EmptyState, Input, Skeleton, buttonClasses, cn } from '@liguita/ui';

import {
  approveWithdrawal,
  listAdminWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawal,
  releaseWithdrawalHold,
  type AdminWithdrawalRow,
} from '../../actions/admin-finance';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';
import { isWithdrawalClosed, withdrawalStatusMeta } from '../../../lib/admin/withdrawal-status';

/**
 * File d'attente des retraits.
 *
 * ⚠️ **L'ordre est chronologique croissant, jamais décroissant.** Partout ailleurs
 * dans la console, le plus récent est en haut. Ici non : le trouveur qui attend
 * depuis le plus longtemps est celui qu'il faut traiter en premier. Un tri
 * anti-chronologique pousserait mécaniquement les demandes anciennes hors de
 * l'écran — exactement l'inverse du but.
 *
 * ⚠️ **Le numéro de destination est affiché en clair.** C'est le seul endroit de
 * l'administration où un numéro apparaît, et c'est nécessaire : sans lui,
 * l'administrateur ne peut pas vérifier que le versement part au bon endroit. La
 * page est réservée au staff (garde du layout), et chaque décision est journalisée.
 */
export default function AdminRetraitsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<AdminWithdrawalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('TO_TREAT');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const result = await listAdminWithdrawals('ALL');
    setItems(result.items);
    setError(result.error ?? null);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  const isAdmin = user?.app_role === 'ADMIN';

  const counts = useMemo(() => {
    return {
      toTreat: items.filter((item) => ['REQUESTED', 'MANUAL_REVIEW'].includes(item.status)).length,
      inFlight: items.filter((item) => ['SUBMITTED', 'PENDING'].includes(item.status)).length,
      overdue: items.filter((item) => item.isOverdue).length,
      total: items.length,
    };
  }, [items]);

  const visible = useMemo(() => {
    if (filter === 'ALL') return items;
    if (filter === 'TO_TREAT') {
      return items.filter((item) => ['REQUESTED', 'MANUAL_REVIEW'].includes(item.status));
    }
    if (filter === 'IN_FLIGHT') {
      return items.filter((item) => ['SUBMITTED', 'PENDING'].includes(item.status));
    }
    if (filter === 'CLOSED') return items.filter((item) => isWithdrawalClosed(item.status));
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  function run(id: string, action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setBusyId(id);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? 'Action impossible.');
      else {
        setError(null);
        setNotice(result.message ?? 'Fait.');
        await load();
      }
      setBusyId(null);
    });
  }

  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        overline="Finances"
        title="Retraits"
        description="Demandes de versement des trouveurs. Les plus anciennes sont en haut."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <RefreshCw size={15} aria-hidden />
              Rafraîchir
            </button>
          </>
        }
      />

      {!isAdmin ? (
        <Alert tone="info" title="Lecture seule">
          Vous consultez la file en tant que modérateur. Seul un administrateur peut valider,
          refuser ou régler un retrait.
        </Alert>
      ) : null}

      {counts.overdue > 0 ? (
        <Alert tone="warning" title={`${counts.overdue} demande(s) hors délai`}>
          Le délai annoncé au trouveur est dépassé. Traitez-les en priorité.
        </Alert>
      ) : null}

      {error ? <Alert tone="danger" title={error} /> : null}
      {notice ? <Alert tone="success" title={notice} /> : null}

      {/* Filtres — des compteurs, pas des onglets muets : on voit le volume
          avant de cliquer. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les retraits">
        {(
          [
            { key: 'TO_TREAT', label: 'À traiter', count: counts.toTreat },
            { key: 'IN_FLIGHT', label: 'Chez l’opérateur', count: counts.inFlight },
            { key: 'CLOSED', label: 'Clôturés', count: items.filter((i) => isWithdrawalClosed(i.status)).length },
            { key: 'ALL', label: 'Tous', count: counts.total },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            aria-pressed={filter === tab.key}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-display text-body-sm font-bold transition-colors',
              filter === tab.key
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300',
            )}
          >
            {tab.label}
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-2xs text-ink-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Rien à traiter"
          description="Aucune demande de retrait ne correspond à ce filtre."
          icon={<CheckCircle2 size={40} aria-hidden />}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <WithdrawalCard
              key={item.id}
              item={item}
              canAct={Boolean(isAdmin)}
              busy={busyId === item.id || isPending}
              onApprove={(note) => run(item.id, () => approveWithdrawal(item.id, note))}
              onReject={(reason) => run(item.id, () => rejectWithdrawal(item.id, reason))}
              onMarkPaid={(reference, note) =>
                run(item.id, () => markWithdrawalPaid(item.id, reference, note))
              }
              onRelease={(reason) => run(item.id, () => releaseWithdrawalHold(item.id, reason))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawalCard({
  item,
  canAct,
  busy,
  onApprove,
  onReject,
  onMarkPaid,
  onRelease,
}: {
  item: AdminWithdrawalRow;
  canAct: boolean;
  busy: boolean;
  onApprove: (note?: string) => void;
  onReject: (reason: string) => void;
  onMarkPaid: (reference?: string, note?: string) => void;
  onRelease: (reason: string) => void;
}) {
  const meta = withdrawalStatusMeta(item.status);
  const [panel, setPanel] = useState<'NONE' | 'REJECT' | 'PAID' | 'RELEASE'>('NONE');
  const [note, setNote] = useState('');

  const closed = isWithdrawalClosed(item.status);
  const canApprove = ['REQUESTED', 'MANUAL_REVIEW'].includes(item.status);
  const canRelease = ['SUBMITTED', 'PENDING'].includes(item.status);
  const canMarkPaid = !closed;

  /*
   * Signal d'alerte : un retrait dont le montant dépasse le solde connu du
   * trouveur, ou une destination qui n'a plus rien à voir avec l'historique.
   * On ne bloque pas — on signale, l'administrateur tranche.
   */
  const suspicious =
    item.beneficiaryBalance !== null && item.amount > item.beneficiaryBalance + 100_000;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {item.isOverdue ? (
              <Badge tone="urgent" dot>
                Hors délai
              </Badge>
            ) : null}
            {suspicious ? (
              <Badge tone="pending" dot>
                Montant inhabituel
              </Badge>
            ) : null}
          </div>

          <p className="mt-2 font-display text-xl font-extrabold text-ink-950">
            {formatMoney(item.amount, item.currency)}
          </p>
          <p className="mt-0.5 text-body-sm text-ink-600">{item.beneficiaryName}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Phone size={13} aria-hidden />
              {item.destination}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} aria-hidden />
              Demandé le {formatShortDate(item.requestedAt)}
            </span>
            <span>Échéance : {formatShortDate(item.slaDueAt)}</span>
            {item.beneficiaryBalance !== null ? (
              <span>Solde : {formatMoney(item.beneficiaryBalance)}</span>
            ) : null}
          </div>

          {item.providerReference ? (
            <p className="mt-1 text-2xs text-ink-500">
              Référence opérateur : {item.providerReference} · {item.payoutAttempts} tentative(s)
            </p>
          ) : null}
          {item.failureReason ? (
            <p className="mt-1 text-caption text-danger-700">{item.failureReason}</p>
          ) : null}
          {item.reviewNote && closed ? (
            <p className="mt-1 text-caption text-ink-500">Note : {item.reviewNote}</p>
          ) : null}
        </div>

        {canAct && !closed ? (
          <div className="flex flex-wrap gap-2">
            {canApprove ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove()}
                className={buttonClasses({ variant: 'primary', size: 'sm' })}
              >
                <Send size={15} aria-hidden />
                Valider et verser
              </button>
            ) : null}
            {canMarkPaid ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPanel(panel === 'PAID' ? 'NONE' : 'PAID')}
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <CheckCircle2 size={15} aria-hidden />
                Marquer payé
              </button>
            ) : null}
            {canRelease ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPanel(panel === 'RELEASE' ? 'NONE' : 'RELEASE')}
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <AlertTriangle size={15} aria-hidden />
                Relever le blocage
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => setPanel(panel === 'REJECT' ? 'NONE' : 'REJECT')}
              className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
              <XCircle size={15} aria-hidden />
              Refuser
            </button>
          </div>
        ) : null}
      </div>

      {panel !== 'NONE' ? (
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-4">
          <p className="font-display text-body-sm font-bold text-ink-900">
            {panel === 'REJECT'
              ? 'Refuser la demande'
              : panel === 'PAID'
                ? 'Marquer comme payé'
                : 'Relever le blocage'}
          </p>
          <p className="mt-0.5 text-caption text-ink-500">
            {panel === 'REJECT'
              ? 'Le montant sera recrédité sur le solde du trouveur.'
              : panel === 'PAID'
                ? 'À utiliser quand le trouveur a bien reçu l’argent mais que l’opérateur ne l’a pas signalé.'
                : 'À utiliser quand le versement a échoué de façon définitive : le montant retourne au trouveur.'}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Input
                label={
                  panel === 'REJECT' || panel === 'RELEASE'
                    ? 'Motif (obligatoire, 5 caractères minimum)'
                    : 'Note (facultative)'
                }
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={busy || ((panel === 'REJECT' || panel === 'RELEASE') && note.trim().length < 5)}
              onClick={() => {
                if (panel === 'REJECT') onReject(note);
                else if (panel === 'RELEASE') onRelease(note);
                else onMarkPaid(undefined, note);
                setNote('');
                setPanel('NONE');
              }}
              className={buttonClasses({
                variant: panel === 'REJECT' ? 'danger' : 'primary',
                size: 'sm',
              })}
            >
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel('NONE');
                setNote('');
              }}
              className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
