'use client';

import { BellRing, PlugZap, RefreshCw, RotateCcw, Webhook } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  TBody,
  THead,
  TR,
  TD,
  TH,
  Table,
  buttonClasses,
} from '@liguita/ui';

import {
  listAdminEnquiryJobs,
  listAdminPaymentEvents,
  requeueEnquiry,
  type AdminEnquiryJobRow,
  type AdminPaymentEventRow,
} from '../../actions/admin-finance';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../lib/auth/auth-context';

/**
 * Paiements — ce que l'opérateur nous a dit, et ce qu'on n'a pas pu confirmer.
 *
 * ⚠️ **Le sujet de cette page n'est pas « lister des lignes ».** Un webhook qui
 * n'arrive pas est invisible par nature : le paiement reste `PENDING`, l'utilisateur
 * est débité, et personne ne s'en aperçoit avant la réclamation. Cette page existe
 * pour rendre visible ce qui, sinon, ne l'est pas :
 *   · les notifications reçues mais **non traitées** (`processed_at` null) ;
 *   · les rapprochements **sans réponse** d'Airtel (statut `UNKNOWN`) ;
 *   · les relances en attente, avec leur nombre de tentatives.
 *
 * D'où l'ordre : les anomalies d'abord, les journaux ensuite.
 */
export default function AdminPaiementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<AdminPaymentEventRow[]>([]);
  const [jobs, setJobs] = useState<AdminEnquiryJobRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const [eventsResult, jobsResult] = await Promise.all([
      listAdminPaymentEvents(),
      listAdminEnquiryJobs(),
    ]);
    setEvents(eventsResult.items);
    setJobs(jobsResult.items);
    setError(eventsResult.error ?? jobsResult.error ?? null);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  function requeue(transactionId: string) {
    startTransition(async () => {
      const result = await requeueEnquiry(transactionId);
      if (result.error) {
        setError(result.error);
        setNotice(null);
      } else {
        setError(null);
        setNotice('Rapprochement relancé. Il sera traité au prochain passage du planificateur.');
        await load();
      }
    });
  }

  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;

  const unprocessed = events.filter((event) => !event.processedAt);
  const unknownJobs = jobs.filter((job) => job.status === 'UNKNOWN');
  const stuckJobs = jobs.filter((job) => job.status === 'PENDING' && job.attempt > 5);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        overline="Finances"
        title="Paiements et notifications"
        description="Notifications de l’opérateur, rapprochements en cours, et ce qui n’a pas abouti."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <RefreshCw size={15} aria-hidden />
            Rafraîchir
          </button>
        }
      />

      {error ? <Alert tone="danger" title={error} /> : null}
      {notice ? <Alert tone="success" title={notice} /> : null}

      {unprocessed.length > 0 ? (
        <Alert tone="warning" title={`${unprocessed.length} notification(s) non traitée(s)`}>
          Ces notifications sont arrivées mais n’ont pas été appliquées. Une transaction concernée
          peut être restée en attente alors que le client a bien payé.
        </Alert>
      ) : null}

      {unknownJobs.length > 0 ? (
        <Alert tone="warning" title={`${unknownJobs.length} rapprochement(s) sans réponse d’Airtel`}>
          L’opérateur n’a jamais confirmé ces transactions. Vérifiez-les manuellement auprès
          d’Airtel, puis relancez le rapprochement.
        </Alert>
      ) : null}

      {/* ---------- Rapprochements ---------- */}
      <Card padding="none">
        <div className="border-b border-ink-100 p-6">
          <h2 className="flex items-center gap-2 font-display text-h3 text-ink-900">
            <RotateCcw size={18} className="text-brand-700" aria-hidden />
            Rapprochements
          </h2>
          <p className="mt-1 text-body-sm text-ink-500">
            Quand un paiement reste en attente, le système interroge Airtel à intervalles
            croissants. Voici où en sont ces vérifications.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Aucun rapprochement"
              description="Rien à vérifier : tous les paiements ont été confirmés par l’opérateur."
              icon={<PlugZap size={40} aria-hidden />}
            />
          </div>
        ) : (
          <Table caption="Rapprochements de paiement en cours">
            <THead>
              <TR>
                <TH>Transaction</TH>
                <TH>Tentatives</TH>
                <TH>Statut</TH>
                <TH>Dernière erreur</TH>
                <TH align="right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {jobs.slice(0, 40).map((job) => (
                <TR key={job.id}>
                  <TD>
                    <span className="font-display font-bold text-ink-900">
                      {job.publicRef ?? job.transactionId.slice(0, 8)}
                    </span>
                  </TD>
                  <TD>{job.attempt} / 15</TD>
                  <TD>
                    <Badge
                      tone={
                        job.status === 'UNKNOWN'
                          ? 'urgent'
                          : job.status === 'PENDING'
                            ? 'pending'
                            : 'found'
                      }
                    >
                      {job.status === 'UNKNOWN'
                        ? 'Sans réponse'
                        : job.status === 'PENDING'
                          ? 'En attente'
                          : job.status === 'PROCESSING'
                            ? 'En cours'
                            : job.status === 'FAILED'
                              ? 'Échec'
                              : 'Terminé'}
                    </Badge>
                  </TD>
                  <TD>
                    <span className="text-caption text-ink-500">{job.lastError ?? '—'}</span>
                  </TD>
                  <TD align="right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => requeue(job.transactionId)}
                      className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                    >
                      Relancer
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* ---------- Notifications reçues ---------- */}
      <Card padding="none">
        <div className="border-b border-ink-100 p-6">
          <h2 className="flex items-center gap-2 font-display text-h3 text-ink-900">
            <Webhook size={18} className="text-brand-700" aria-hidden />
            Notifications reçues
          </h2>
          <p className="mt-1 text-body-sm text-ink-500">
            Chaque appel de l’opérateur est conservé, y compris les doublons ignorés — c’est la
            piste d’audit en cas de litige.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Aucune notification"
              description="L’opérateur n’a encore rien envoyé. Cela ne concerne que les paiements en ligne."
              icon={<BellRing size={40} aria-hidden />}
            />
          </div>
        ) : (
          <Table caption="Notifications de paiement reçues">
            <THead>
              <TR>
                <TH>Reçue</TH>
                <TH>Transaction</TH>
                <TH>Opérateur</TH>
                <TH>Statut Airtel</TH>
                <TH>Type</TH>
                <TH>Traitement</TH>
              </TR>
            </THead>
            <TBody>
              {events.slice(0, 60).map((event) => (
                <TR key={event.id}>
                  <TD>
                    <span className="text-caption text-ink-600">
                      {new Date(event.receivedAt).toISOString().slice(0, 16).replace('T', ' ')}
                    </span>
                  </TD>
                  <TD>
                    <span className="font-display font-bold text-ink-900">
                      {event.publicRef ?? event.transactionId.slice(0, 8)}
                    </span>
                  </TD>
                  <TD>{event.provider}</TD>
                  <TD>
                    <code className="text-caption text-ink-700">{event.airtelStatus ?? '—'}</code>
                  </TD>
                  <TD>
                    <span className="text-caption text-ink-500">{event.eventType}</span>
                  </TD>
                  <TD>
                    <Badge tone={event.processedAt ? 'found' : 'urgent'}>
                      {event.processedAt ? 'Traité' : 'Non traité'}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {stuckJobs.length > 0 ? (
        <p className="text-caption text-ink-500">
          {stuckJobs.length} rapprochement(s) dépassent 5 tentatives sans aboutir — signe probable
          d’un incident côté opérateur.
        </p>
      ) : null}
    </div>
  );
}
