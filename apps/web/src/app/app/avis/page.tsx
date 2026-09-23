'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { buttonClasses, EmptyState, Skeleton } from '@liguita/ui';

import {
  listMySearches,
  toggleSavedSearch,
  deleteSavedSearch,
  type SavedSearch,
} from '../../actions/saved-searches';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';

export default function AvisDeRecherchePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/connexion?redirect=/app/avis');
      return;
    }

    let cancelled = false;
    listMySearches().then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else setItems(result.items);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  async function handleToggle(search: SavedSearch) {
    const next = !search.is_active;
    setItems((prev) => prev.map((s) => (s.id === search.id ? { ...s, is_active: next } : s)));
    const result = await toggleSavedSearch(search.id, next);
    if (!result.ok) {
      setItems((prev) =>
        prev.map((s) => (s.id === search.id ? { ...s, is_active: search.is_active } : s)),
      );
      setError(result.error ?? 'Mise à jour impossible.');
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    const result = await deleteSavedSearch(id);
    if (!result.ok) setError(result.error ?? 'Suppression impossible.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Mes avis de recherche
          </h1>
          <p className="mt-1 text-body text-ink-600">
            Recevez une alerte quand un objet correspondant est publié (max 3 / jour).
          </p>
        </div>
        <Link href="/rechercher" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
          Lancer une recherche
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rect" className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="text-body text-danger-700">
          {error}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun avis de recherche"
          description="Enregistrez une recherche pour être notifié dès qu'un objet correspondant est trouvé."
          action={
            <Link href="/rechercher" className={buttonClasses({ variant: 'primary' })}>
              Rechercher un objet
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-display text-body-lg font-bold text-ink-950">{s.label}</p>
                <p className="mt-0.5 text-caption text-ink-500">
                  {s.query ? `« ${s.query} » · ` : ''}
                  {s.category_code ?? ''} {s.city_slug ? `· ${s.city_slug}` : ''} · créé le{' '}
                  {formatShortDate(s.created_at)}
                  {s.last_run_at ? ` · dernière analyse ${formatShortDate(s.last_run_at)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(s)}
                  className={buttonClasses({ variant: 'outline', size: 'sm' })}
                  aria-pressed={s.is_active}
                >
                  {s.is_active ? 'Active' : 'En pause'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
