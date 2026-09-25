'use client';

import { ArrowLeft, MessageCircle, ShieldCheck, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Badge, buttonClasses, Skeleton } from '@liguita/ui';

import { getMatchDetail, getMatchPhotos, setMatchStatus, type MatchDetail, type MatchPhoto } from '../../../actions/matches';
import { MatchPhotoGallery } from '../../../../components/app/MatchPhotoGallery';
import { useAuth } from '../../../../lib/auth/auth-context';
import { formatLongDate } from '../../../../lib/format';

const LEVEL_BADGE: Record<string, string> = {
  VERY_LIKELY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POSSIBLE: 'bg-amber-50 text-amber-700 border-amber-200',
  WEAK: 'bg-ink-50 text-ink-600 border-ink-200',
};

const LEVEL_TEXT: Record<string, string> = {
  VERY_LIKELY: 'Correspondance très probable',
  POSSIBLE: 'Correspondance possible',
  WEAK: 'Correspondance à vérifier',
};

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [item, setItem] = useState<MatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<MatchPhoto[]>([]);
  const [canSeeCounterpart, setCanSeeCounterpart] = useState(false);
  const [viewerSide, setViewerSide] = useState<'lost' | 'found' | 'staff'>('staff');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matchId = params.id;

  useEffect(() => {
    if (authLoading || !user || !matchId) return;
    let cancelled = false;

    getMatchDetail(matchId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else if (!result.item) setError('Correspondance introuvable.');
      else {
        setItem(result.item);
        void getMatchPhotos(matchId).then((photoResult) => {
          if (cancelled) return;
          if (photoResult.success) {
            setPhotos(photoResult.photos ?? []);
            setCanSeeCounterpart(photoResult.canSeeCounterpart ?? false);
            setViewerSide(photoResult.viewerSide ?? 'staff');
          } else {
            setPhotoError(photoResult.error ?? 'Les photos sont indisponibles.');
          }
        });
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, matchId]);

  function handleStatus(status: 'REJECTED') {
    if (!item) return;
    startTransition(async () => {
      const result = await setMatchStatus(item.id, status);
      if (result.ok) {
        setItem({ ...item, status });
        if (status === 'REJECTED') router.push('/app/correspondances');
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  function handleOpenConversation() {
    if (!item) return;
    router.push(`/app/correspondances/${item.id}/paiement`);
  }

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-48" />
        <Skeleton variant="rect" className="h-40 w-full" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Link
          href="/app/correspondances"
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft size={16} /> Retour
        </Link>
        <p role="alert" className="text-body text-danger-700">
          {error ?? 'Erreur inconnue.'}
        </p>
      </div>
    );
  }

  const rounded = Math.round(item.score / 10) * 10;

  return (
    <div className="space-y-6">
      <Link href="/app/correspondances" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft size={16} /> Toutes les correspondances
      </Link>

      <div className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-caption font-bold ${LEVEL_BADGE[item.level] ?? LEVEL_BADGE.WEAK}`}
          >
            {LEVEL_TEXT[item.level] ?? item.level}
          </span>
          <Badge tone="outline">~{rounded} %</Badge>
          <Badge tone={item.status === 'REJECTED' ? 'neutral' : 'found'}>
            {item.status === 'NEW' ? 'Nouveau' : item.status}
          </Badge>
        </div>

        <p className="mt-3 text-body-sm text-ink-600">
          Détectée le {formatLongDate(item.created_at)}. Le score exact n'est jamais affiché
          publiquement : le badge est arrondi à la dizaine.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {item.lost ? (
            <section className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <h2 className="font-display text-body-lg font-bold text-ink-950">Objet perdu</h2>
              <p className="mt-1 font-display text-h3 text-ink-900">{item.lost.title}</p>
              <dl className="mt-3 space-y-1.5 text-caption text-ink-700">
                <div>
                  <dt className="inline font-semibold">Lieu :</dt>{' '}
                  <dd className="inline">
                    {item.lost.place_label}
                    {item.lost.neighborhood_slug ? ` · ${item.lost.neighborhood_slug}` : ''} ·{' '}
                    {item.lost.city_slug}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Date :</dt>{' '}
                  <dd className="inline">{formatLongDate(item.lost.occurred_at)}</dd>
                </div>
                {item.lost.brand ? (
                  <div>
                    <dt className="inline font-semibold">Marque :</dt>{' '}
                    <dd className="inline">{item.lost.brand}</dd>
                  </div>
                ) : null}
                {item.lost.color ? (
                  <div>
                    <dt className="inline font-semibold">Couleur :</dt>{' '}
                    <dd className="inline">{item.lost.color}</dd>
                  </div>
                ) : null}
                {item.lost.description ? (
                  <div>
                    <dt className="inline font-semibold">Description :</dt>{' '}
                    <dd className="inline">{item.lost.description}</dd>
                  </div>
                ) : null}
              </dl>
              <MatchPhotoGallery
                photos={photos}
                side="lost"
                canSeeCounterpart={canSeeCounterpart}
                isCounterpart={viewerSide === 'found'}
              />
            </section>
          ) : null}

          {item.found ? (
            <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <h2 className="font-display text-body-lg font-bold text-ink-950">Objet trouvé</h2>
              <p className="mt-1 font-display text-h3 text-ink-900">{item.found.title}</p>
              <dl className="mt-3 space-y-1.5 text-caption text-ink-700">
                <div>
                  <dt className="inline font-semibold">Lieu :</dt>{' '}
                  <dd className="inline">
                    {item.found.place_label}
                    {item.found.neighborhood_slug
                      ? ` · ${item.found.neighborhood_slug}`
                      : ''} · {item.found.city_slug}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Date :</dt>{' '}
                  <dd className="inline">{formatLongDate(item.found.found_at)}</dd>
                </div>
                {item.found.brand ? (
                  <div>
                    <dt className="inline font-semibold">Marque :</dt>{' '}
                    <dd className="inline">{item.found.brand}</dd>
                  </div>
                ) : null}
                {item.found.color ? (
                  <div>
                    <dt className="inline font-semibold">Couleur :</dt>{' '}
                    <dd className="inline">{item.found.color}</dd>
                  </div>
                ) : null}
                {item.found.description ? (
                  <div>
                    <dt className="inline font-semibold">Description :</dt>{' '}
                    <dd className="inline">{item.found.description}</dd>
                  </div>
                ) : null}
              </dl>
              <MatchPhotoGallery
                photos={photos}
                side="found"
                canSeeCounterpart={canSeeCounterpart}
                isCounterpart={viewerSide === 'lost'}
              />
            </section>
          ) : null}
        </div>

        {photoError ? <p role="alert" className="text-caption text-danger-700">{photoError}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-ink-100 pt-4">
          <Link
            href={`/app/correspondances/${item.id}/verification`}
            className={buttonClasses({ variant: 'primary' })}
          >
            <ShieldCheck size={16} /> Vérifier ma propriété
          </Link>
           {item.status === 'CLAIMED' && item.claimStatus === 'APPROVED' ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleOpenConversation}
              className={buttonClasses({ variant: 'outline' })}
            >
              <MessageCircle size={16} /> Payer et mettre en relation
            </button>
          ) : null}
          <button
            type="button"
            disabled={isPending || item.status === 'REJECTED'}
            onClick={() => handleStatus('REJECTED')}
            className={buttonClasses({ variant: 'outline' })}
          >
            <ThumbsDown size={16} /> Pas le mien
          </button>
        </div>
      </div>
    </div>
  );
}
