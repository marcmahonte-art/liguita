'use client';

import { AlertTriangle, Check, CircleCheck, CircleX, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { Alert, Badge, buttonClasses, Card, EmptyState, Skeleton } from '@liguita/ui';

import { listClaimsForReview, reviewClaim, type ClaimReviewItem } from '../../actions/verification';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';

const STATUS_LABEL: Record<string, { text: string; tone: 'pending' | 'found' | 'neutral' }> = {
  UNDER_REVIEW: { text: 'À relire', tone: 'pending' },
  APPROVED: { text: 'Approuvée', tone: 'found' },
  REJECTED: { text: 'Refusée', tone: 'neutral' },
};

export default function ModerationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ClaimReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listClaimsForReview();
    if (res.error) setError(res.error);
    else {
      setError(null);
      setItems(res.items);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [user, authLoading, load]);

  function handleDecision(id: string, decision: 'APPROVED' | 'REJECTED') {
    startTransition(async () => {
      const res = await reviewClaim(
        id,
        decision,
        decision === 'REJECTED' ? 'Revue manuelle' : undefined,
      );
      if (!res.ok) setFlash(res.error ?? 'Échec');
      else setFlash(decision === 'APPROVED' ? 'Demande approuvée.' : 'Demande refusée.');
      await load();
    });
  }

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-48" />
        <Skeleton variant="rect" className="h-40 w-full" />
      </div>
    );
  }

  if (!user || (user.app_role !== 'MODERATOR' && user.app_role !== 'ADMIN')) {
    return (
      <EmptyState
        title="Accès réservé"
        description="Cette page est réservée aux modérateurs et administrateurs."
        action={
          <Link href="/app" className={buttonClasses({ variant: 'outline' })}>
            Retour à mon espace
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Revue des vérifications
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Demandes entre 50 et 79, ou envoyées sans réponses attendues. Décision sous 24 h (§7.5).
        </p>
      </div>

      {flash ? <Alert tone="info" title={flash} /> : null}
      {error ? <Alert tone="danger" title={error} /> : null}

      {items.length === 0 && !error ? (
        <EmptyState
          title="Aucune demande"
          description="Les vérifications en attente de revue apparaîtront ici."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const status = STATUS_LABEL[item.status] ?? {
              text: item.status,
              tone: 'neutral' as const,
            };
            return (
              <li key={item.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={status.tone}>{status.text}</Badge>
                        <Badge tone="outline">Score {item.score}</Badge>
                        <Badge tone="neutral">Tentative {item.attemptCount}/3</Badge>
                      </div>
                      <p className="mt-2 font-display text-body-lg font-bold text-ink-950">
                        {item.lostTitle ?? '—'} ↔ {item.foundTitle ?? '—'}
                      </p>
                      <p className="text-caption text-ink-500">
                        Déposée le {formatShortDate(item.createdAt)} ·{' '}
                        <Link
                          href={`/app/correspondances/${item.matchId}`}
                          className="text-brand-700 underline"
                        >
                          Voir la correspondance
                        </Link>
                      </p>
                    </div>

                    {item.status === 'UNDER_REVIEW' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDecision(item.id, 'APPROVED')}
                          className={buttonClasses({ variant: 'primary', size: 'sm' })}
                        >
                          <Check size={16} /> Approuver
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDecision(item.id, 'REJECTED')}
                          className={buttonClasses({ variant: 'outline', size: 'sm' })}
                        >
                          <X size={16} /> Refuser
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {item.answers.length > 0 ? (
                    <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
                      <p className="flex items-center gap-1.5 text-caption font-bold text-ink-700">
                        <AlertTriangle size={14} className="text-warning-600" aria-hidden />
                        Réponses (usage interne — jamais renvoyées au demandeur)
                      </p>
                      <dl className="space-y-2">
                        {item.answers.map((a, i) => (
                          <div key={`${item.id}-${i}`} className="rounded-lg bg-ink-50 p-3">
                            <dt className="text-caption font-bold text-ink-700">{a.prompt}</dt>
                            <dd className="mt-0.5 text-body-sm text-ink-900">
                              {a.answer}
                              {a.isCorrect === true ? (
                                /* L'icône ne doit jamais porter seule l'information : le
                                   libellé est rendu aux lecteurs d'écran via `sr-only`. */
                                <span className="ml-2 inline-flex items-center gap-1 align-middle text-success-700">
                                  <CircleCheck size={14} aria-hidden />
                                  <span className="sr-only">Réponse correcte</span>
                                </span>
                              ) : a.isCorrect === false ? (
                                <span className="ml-2 inline-flex items-center gap-1 align-middle text-danger-700">
                                  <CircleX size={14} aria-hidden />
                                  <span className="sr-only">Réponse incorrecte</span>
                                </span>
                              ) : null}
                            </dd>
                            {a.evidenceUrl ? (
                              <div className="mt-3">
                                <p className="mb-1 text-2xs font-bold uppercase tracking-wide text-ink-500">
                                  Preuve photo privée
                                </p>
                                <img
                                  src={a.evidenceUrl}
                                  alt="Preuve photo de vérification"
                                  className="max-h-64 w-full rounded-lg border border-ink-200 object-cover"
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
