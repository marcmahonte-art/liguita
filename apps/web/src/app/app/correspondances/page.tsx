'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { buttonClasses, EmptyState, Skeleton } from '@liguita/ui';

import { listMyMatches, type MatchListItem } from '../../actions/matches';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';

const LEVEL_LABEL: Record<string, { text: string; tone: string }> = {
  VERY_LIKELY: { text: 'Très probable', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  POSSIBLE: { text: 'Possible', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  WEAK: { text: 'À vérifier', tone: 'bg-ink-50 text-ink-600 border-ink-200' },
};

const DEFAULT_LEVEL = { text: 'À vérifier', tone: 'bg-ink-50 text-ink-600 border-ink-200' };

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nouveau',
  SEEN: 'Vu',
  CLAIMED: 'En cours',
  REJECTED: 'Rejeté',
  EXPIRED: 'Expiré',
  CONVERTED: 'Converti',
};

export default function CorrespondancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<MatchListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let cancelled = false;
    setIsLoading(true);
    listMyMatches()
      .then((result) => {
        if (cancelled) return;
        if (result.error) setError(result.error);
        else setItems(result.items);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Impossible de charger les correspondances.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Mes correspondances
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Objets trouvés qui correspondent à vos déclarations de perte (et inversement).
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Chargement">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-ink-200 bg-white p-5">
              <Skeleton variant="rect" className="h-4 w-24" />
              <Skeleton variant="rect" className="mt-3 h-6 w-3/4" />
              <Skeleton variant="rect" className="mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-body text-danger-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonClasses({ variant: 'outline', size: 'sm' })}
          >
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune correspondance pour le moment"
          description="Publiez une déclaration de perte ou d'un objet trouvé — Liguita cherche en continu."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/declarer/perdu" className={buttonClasses({ variant: 'primary' })}>
                J'ai perdu un objet
              </Link>
              <Link href="/rechercher" className={buttonClasses({ variant: 'outline' })}>
                Rechercher
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((m) => {
            const level = LEVEL_LABEL[m.level] ?? DEFAULT_LEVEL;
            const rounded = Math.round(m.score / 10) * 10;
            return (
              <li key={m.id}>
                <Link
                  href={`/app/correspondances/${m.id}`}
                  className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-caption font-bold ${level.tone}`}
                    >
                      {level.text}
                    </span>
                    <span className="text-caption font-semibold text-ink-500">
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </div>

                  <h2 className="mt-3 font-display text-body-lg font-bold text-ink-950">
                    {m.title}
                  </h2>
                  {m.counterpart_title ? (
                    <p className="mt-1 text-caption text-ink-600">
                      ↔ {m.counterpart_title}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-caption text-ink-500">
                    <span>{m.city_slug ? m.city_slug.replace(/-/g, ' ') : ''}</span>
                    <span>
                      {formatShortDate(m.created_at)} · ~{rounded} %
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
