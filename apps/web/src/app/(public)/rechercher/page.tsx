'use client';

import {
  Bookmark,
  BookmarkCheck,
  Filter,
  Search,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CATEGORIES, NEIGHBORHOODS } from '@liguita/config';
import { Alert, buttonClasses, cn, EmptyState, Skeleton } from '@liguita/ui';

import { saveSearch } from '../../actions/saved-searches';
import { ItemCard } from '../../../components/public/ItemCard';
import { createClient } from '../../../lib/supabase/client';
import { toPublicItem, type PublicItem } from '../../../lib/search';

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;

type KindFilter = 'all' | 'found';

interface SearchState {
  items: PublicItem[];
  isLoading: boolean;
  error: string | null;
  nextCursorFoundAt: string | null;
  nextCursorId: string | null;
  hasMore: boolean;
}

const INITIAL_STATE: SearchState = {
  items: [],
  isLoading: true,
  error: null,
  nextCursorFoundAt: null,
  nextCursorId: null,
  hasMore: false,
};

function SearchContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const urlQuery = searchParams.get('q') ?? '';
  const urlKind = (searchParams.get('kind') ?? 'all') as KindFilter;
  const urlCategory = searchParams.get('category') ?? 'ALL';
  const urlNeighborhood = searchParams.get('neighborhood') ?? 'ALL';

  const [query, setQuery] = useState(urlQuery);
  const [selectedKind, setSelectedKind] = useState<KindFilter>(urlKind);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(urlNeighborhood);
  const [isOnline, setIsOnline] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [saveState, setSaveState] = useState<{
    status: 'idle' | 'saving' | 'saved' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const [state, setState] = useState<SearchState>(INITIAL_STATE);
  const cursorRef = useRef<{ foundAt: string | null; id: string | null }>({
    foundAt: null,
    id: null,
  });
  const requestIdRef = useRef(0);

  /* ---------------------------------------------------------------- URLs -- */
  const replaceUrl = useCallback(
    (next: { q?: string; kind?: KindFilter; category?: string; neighborhood?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value: string | undefined, fallback: string) => {
        if (!value || value === fallback) params.delete(key);
        else params.set(key, value);
      };
      setOrDelete('q', next.q ?? query, '');
      setOrDelete('kind', next.kind ?? selectedKind, 'all');
      setOrDelete('category', next.category ?? selectedCategory, 'ALL');
      setOrDelete('neighborhood', next.neighborhood ?? selectedNeighborhood, 'ALL');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, query, selectedKind, selectedCategory, selectedNeighborhood],
  );

  /* --------------------------------------------------------------- offline */
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  /* -------------------------------------------------- debounce q → URL ----- */
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query !== urlQuery) replaceUrl({ q: query });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, urlQuery, replaceUrl]);

  /* ------------------------------------------------------ filtres → URL ---- */
  useEffect(() => {
    if (selectedKind !== urlKind || selectedCategory !== urlCategory || selectedNeighborhood !== urlNeighborhood) {
      replaceUrl({ kind: selectedKind, category: selectedCategory, neighborhood: selectedNeighborhood });
    }
  }, [selectedKind, selectedCategory, selectedNeighborhood, urlKind, urlCategory, urlNeighborhood, replaceUrl]);

  /* -------------------------------------------------------------- requête -- */
  const fetchPage = useCallback(
    async (mode: 'reset' | 'more') => {
      const requestId = ++requestIdRef.current;
      const q = (mode === 'reset' ? query : urlQuery).trim();

      if (mode === 'reset') {
        cursorRef.current = { foundAt: null, id: null };
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      if (!isOnline) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Vous êtes hors ligne. Les résultats ne peuvent pas être actualisés.',
        }));
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('search_found_items', {
          p_query: q || null,
          p_category_code: urlCategory === 'ALL' ? null : urlCategory,
          p_neighborhood_slug: urlNeighborhood === 'ALL' ? null : urlNeighborhood,
          p_limit: PAGE_SIZE,
          p_cursor_found_at: mode === 'more' ? cursorRef.current.foundAt : null,
          p_cursor_id: mode === 'more' ? cursorRef.current.id : null,
        });

        if (requestId !== requestIdRef.current) return;

        if (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error.message || 'La recherche a échoué.',
          }));
          return;
        }

        const rows = Array.isArray(data) ? data : [];
        const mapped = rows.map((row) => toPublicItem(row as Record<string, unknown>));
        const last = rows[rows.length - 1] as
          | { next_cursor_found_at?: string | null; next_cursor_id?: string | null }
          | undefined;

        const nextFoundAt = last?.next_cursor_found_at ?? null;
        const nextId = last?.next_cursor_id ?? null;
        cursorRef.current = { foundAt: nextFoundAt, id: nextId };

        setState((prev) => ({
          items: mode === 'more' ? [...prev.items, ...mapped] : mapped,
          isLoading: false,
          error: null,
          nextCursorFoundAt: nextFoundAt,
          nextCursorId: nextId,
          hasMore: Boolean(nextFoundAt && nextId),
        }));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Erreur réseau inattendue.',
        }));
      }
    },
    [query, urlQuery, urlCategory, urlNeighborhood, isOnline],
  );

  // Rechargement à chaque changement de critères (reset).
  useEffect(() => {
    void fetchPage('reset');
  }, [fetchPage, retryToken]);

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return state.items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [state.items]);

  const filtersActive =
    query || selectedKind !== 'all' || selectedCategory !== 'ALL' || selectedNeighborhood !== 'ALL';

  const resetFilters = () => {
    setQuery('');
    setSelectedKind('all');
    setSelectedCategory('ALL');
    setSelectedNeighborhood('ALL');
  };

  const handleSaveSearch = async () => {
    if (saveState.status === 'saving' || saveState.status === 'saved') return;
    setSaveState({ status: 'saving' });
    try {
      const result = await saveSearch({
        label: query.trim() || undefined,
        query: query.trim() || undefined,
        categoryCode: selectedCategory === 'ALL' ? undefined : selectedCategory,
        neighborhoodSlug: selectedNeighborhood === 'ALL' ? undefined : selectedNeighborhood,
      });
      if (result.ok) {
        setSaveState({ status: 'saved' });
      } else {
        setSaveState({ status: 'error', message: result.error });
      }
    } catch {
      setSaveState({
        status: 'error',
        message: 'Connectez-vous pour enregistrer cette recherche.',
      });
    }
  };

  return (
    <div className="bg-ink-50/40 min-h-screen py-10 sm:py-14">
      <div className="container-liguita">
        {!isOnline ? (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded-xl border border-warning-500/40 bg-warning-50 px-4 py-3 text-body-sm font-semibold text-warning-700"
          >
            <WifiOff size={18} aria-hidden />
            Mode hors ligne — les résultats affichés peuvent être obsolètes.
          </div>
        ) : null}

        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Rechercher un objet
          </h1>
          <p className="mt-2 text-body text-ink-600">
            Consultez les objets trouvés enregistrés à N&apos;Djamena et au Tchad. Aucune
            donnée personnelle n&apos;est exposée (loi n° 007/PR/2015).
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={20} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par mot-clé (ex: carte nationale, iPhone, clés de voiture...)"
              aria-label="Mot-clé de recherche"
              className="w-full rounded-xl border border-ink-200 bg-ink-50/50 py-3 pl-11 pr-4 text-body font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
            <div className="mr-2 flex items-center gap-1.5 text-caption font-semibold text-ink-500">
              <Filter size={15} aria-hidden />
              <span>Filtres :</span>
            </div>

            <div className="inline-flex rounded-lg bg-ink-100 p-1" role="group" aria-label="Type d'objet">
              <button
                type="button"
                onClick={() => setSelectedKind('all')}
                className={cn(
                  'rounded-md px-3 py-1 text-caption font-semibold transition',
                  selectedKind === 'all'
                    ? 'bg-white text-ink-900 shadow-2xs'
                    : 'text-ink-600 hover:text-ink-900',
                )}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setSelectedKind('found')}
                className={cn(
                  'rounded-md px-3 py-1 text-caption font-semibold transition',
                  selectedKind === 'found'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-ink-600 hover:text-ink-900',
                )}
              >
                Objets trouvés
              </button>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Catégorie"
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-caption font-semibold text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.labelFr}
                </option>
              ))}
            </select>

            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              aria-label="Quartier"
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-caption font-semibold text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Tous les quartiers (N&apos;Djamena)</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.name} ({n.arrondissement}e arr.)
                </option>
              ))}
            </select>

            {filtersActive ? (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto text-caption font-semibold text-brand-600 hover:underline"
              >
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm font-semibold text-ink-700" aria-live="polite">
            {state.isLoading
              ? 'Recherche en cours…'
              : `${uniqueItems.length} ${uniqueItems.length <= 1 ? 'résultat trouvé' : 'résultats trouvés'}`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSaveSearch()}
              disabled={saveState.status === 'saving' || saveState.status === 'saved'}
              className={cn(
                buttonClasses({ variant: saveState.status === 'saved' ? 'outline' : 'primary', size: 'sm' }),
                saveState.status === 'saved' && 'border-emerald-300 text-emerald-700',
              )}
              aria-live="polite"
            >
              {saveState.status === 'saving' ? (
                'Enregistrement…'
              ) : saveState.status === 'saved' ? (
                <>
                  <BookmarkCheck size={15} aria-hidden />
                  Recherche enregistrée
                </>
              ) : (
                <>
                  <Bookmark size={15} aria-hidden />
                  Enregistrer cette recherche
                </>
              )}
            </button>
            <div className="flex items-center gap-1.5 text-caption text-ink-500">
              <ShieldCheck size={16} className="text-emerald-600" aria-hidden />
              <span>Données privées protégées (loi n° 007/PR/2015)</span>
            </div>
          </div>
        </div>

        {saveState.status === 'error' && saveState.message ? (
          <Alert tone="warning" title="Enregistrement impossible" className="mt-3">
            {saveState.message}
          </Alert>
        ) : null}

        {state.error ? (
          <Alert
            tone="danger"
            title="La recherche a échoué"
            className="mt-4"
            action={
              <button
                type="button"
                onClick={() => setRetryToken((t) => t + 1)}
                className={buttonClasses({ variant: 'outline', size: 'sm' })}
              >
                Réessayer
              </button>
            }
          >
            {state.error}
          </Alert>
        ) : null}

        <div className="mt-4">
          {state.isLoading && uniqueItems.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs"
                >
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="mt-4 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                  <Skeleton className="mt-4 h-4 w-1/2" />
                  <Skeleton className="mt-6 h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : uniqueItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {uniqueItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>

              {state.isLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Skeleton variant="rect" className="h-48" />
                  <Skeleton variant="rect" className="h-48" />
                  <Skeleton variant="rect" className="h-48" />
                  <Skeleton variant="rect" className="h-48" />
                </div>
              ) : state.hasMore ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void fetchPage('more')}
                    className={buttonClasses({ variant: 'outline' })}
                  >
                    Afficher plus
                  </button>
                </div>
              ) : null}
            </>
          ) : !state.isLoading && !state.error ? (
            <EmptyState
              title="Aucun objet ne correspond à votre recherche"
              description="Votre objet n'a pas encore été signalé par un trouveur ? Enregistrez une déclaration de perte : notre moteur vous notifiera dès qu'une correspondance sera trouvée."
              action={
                <Link href="/declarer/perdu" className={buttonClasses({ variant: 'primary' })}>
                  Déclarer mon objet perdu
                </Link>
              }
            />
          ) : null}
        </div>

        <div className="mt-10 rounded-2xl border border-ink-200 bg-white p-5 text-caption text-ink-600">
          <p>
            Explorez aussi{' '}
            <Link href="/objets-trouves" className="font-semibold text-brand-700 hover:underline">
              les derniers objets trouvés
            </Link>{' '}
            au Tchad — mise à jour automatique chaque heure.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container-liguita py-16 text-center text-ink-600">
          Chargement de la recherche…
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
