'use client';

import {
  Calendar,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { CATEGORIES, NEIGHBORHOODS } from '@liguita/config';
import { buttonClasses, cn } from '@liguita/ui';

import { MOCK_ITEMS } from '../../../lib/mock-data';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedKind, setSelectedKind] = useState<'ALL' | 'FOUND' | 'LOST'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('ALL');

  // Filtrage des résultats
  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter((item) => {
      // Filtre type
      if (selectedKind !== 'ALL' && item.kind !== selectedKind) {
        return false;
      }
      // Filtre catégorie
      if (selectedCategory !== 'ALL' && !item.categoryId.startsWith(selectedCategory)) {
        return false;
      }
      // Filtre quartier
      if (selectedNeighborhood !== 'ALL' && item.neighborhoodSlug !== selectedNeighborhood) {
        return false;
      }
      // Filtre texte
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
        const matchPlace = item.placeLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchPlace) {
          return false;
        }
      }
      return true;
    });
  }, [query, selectedKind, selectedCategory, selectedNeighborhood]);

  return (
    <div className="bg-ink-50/40 min-h-screen py-10 sm:py-14">
      <div className="container-liguita">
        {/* Titre & sous-titre */}
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Rechercher un objet
          </h1>
          <p className="mt-2 text-body text-ink-600">
            Consultez les déclarations d'objets perdus et trouvés enregistrées à N'Djamena et au Tchad.
          </p>
        </div>

        {/* Barre de recherche principale */}
        <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-4 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par mot-clé (ex: carte nationale, iPhone, clés de voiture...)"
              className="w-full rounded-xl border border-ink-200 bg-ink-50/50 py-3 pl-11 pr-4 text-body font-medium text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filtres interactifs */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
            <div className="flex items-center gap-1.5 text-caption font-semibold text-ink-500 mr-2">
              <Filter size={15} />
              <span>Filtres :</span>
            </div>

            {/* Type : Tout / Trouvé / Perdu */}
            <div className="inline-flex rounded-lg bg-ink-100 p-1">
              <button
                type="button"
                onClick={() => setSelectedKind('ALL')}
                className={cn(
                  'rounded-md px-3 py-1 text-caption font-semibold transition',
                  selectedKind === 'ALL'
                    ? 'bg-white text-ink-900 shadow-2xs'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setSelectedKind('FOUND')}
                className={cn(
                  'rounded-md px-3 py-1 text-caption font-semibold transition',
                  selectedKind === 'FOUND'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                Objets trouvés
              </button>
              <button
                type="button"
                onClick={() => setSelectedKind('LOST')}
                className={cn(
                  'rounded-md px-3 py-1 text-caption font-semibold transition',
                  selectedKind === 'LOST'
                    ? 'bg-brand-500 text-white shadow-2xs'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                Objets perdus
              </button>
            </div>

            {/* Sélecteur Catégorie */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-caption font-semibold text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Toutes les catégories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.labelFr}
                </option>
              ))}
            </select>

            {/* Sélecteur Quartier N'Djamena */}
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-caption font-semibold text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">Tous les quartiers (N'Djamena)</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.name} ({n.arrondissement}e arr.)
                </option>
              ))}
            </select>

            {(query || selectedKind !== 'ALL' || selectedCategory !== 'ALL' || selectedNeighborhood !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedKind('ALL');
                  setSelectedCategory('ALL');
                  setSelectedNeighborhood('ALL');
                }}
                className="text-caption font-semibold text-brand-600 hover:underline ml-auto"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Compteur de résultats */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-body-sm font-semibold text-ink-700">
            {filteredItems.length} {filteredItems.length <= 1 ? 'résultat trouvé' : 'résultats trouvés'}
          </p>
          <div className="flex items-center gap-1.5 text-caption text-ink-500">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Données privées protégées (loi n° 007/PR/2015)</span>
          </div>
        </div>

        {/* Liste des résultats */}
        {filteredItems.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const isFound = item.kind === 'FOUND';
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-ink-200 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-card"
                >
                  <div>
                    {/* Badge type */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold',
                          isFound
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-brand-50 text-brand-700 border border-brand-200'
                        )}
                      >
                        <span className={cn('size-2 rounded-full', isFound ? 'bg-emerald-500' : 'bg-brand-500')} />
                        {isFound ? 'Objet trouvé' : 'Objet perdu'}
                      </span>

                      <span className="text-caption text-ink-400">
                        {item.status === 'MATCHED' ? 'Correspondance en cours' : 'Actif'}
                      </span>
                    </div>

                    {/* Titre */}
                    <h3 className="mt-3 font-display text-body-lg font-bold text-ink-950">
                      {item.title}
                    </h3>

                    {/* Description tronquée sans données sensibles */}
                    {item.description && (
                      <p className="mt-1.5 text-caption text-ink-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Localisation et Date */}
                    <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3 text-caption text-ink-600">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-ink-400 shrink-0" />
                        <span>{item.placeLabel} (N'Djamena)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-ink-400 shrink-0" />
                        <span>
                          {new Date(item.occurredAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-5 border-t border-ink-100 pt-3">
                    <Link
                      href={isFound ? `/declarer/perdu?match=${item.id}` : `/declarer/trouve?match=${item.id}`}
                      className={buttonClasses({
                        variant: isFound ? 'primary' : 'outline',
                        block: true,
                        size: 'sm',
                      })}
                    >
                      {isFound ? "C'est mon objet !" : "J'ai cet objet"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* État vide */
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
              <Search size={28} />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-ink-900">
              Aucun objet ne correspond à votre recherche
            </h3>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-600">
              Votre objet n'a pas encore été signalé par un trouveur ? Enregistrez dès maintenant une déclaration de perte. Notre moteur Liguita vous notifiera immédiatement dès qu'une correspondance sera trouvée.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/declarer/perdu"
                className={buttonClasses({ variant: 'primary' })}
              >
                Déclarer mon objet perdu
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-liguita py-16 text-center">Chargement de la recherche...</div>}>
      <SearchContent />
    </Suspense>
  );
}
