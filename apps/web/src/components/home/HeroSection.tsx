'use client';

import { ArrowRight, CheckCircle2, Search, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SUGGESTIONS = [
  'Carte nationale',
  'Téléphone',
  'Portefeuille',
  'Clés',
  'Passeport',
  'Permis de conduire',
];

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/rechercher?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/rechercher');
    }
  };

  const handleSuggestionClick = (term: string) => {
    router.push(`/rechercher?q=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-ink-50/40 to-white py-12 sm:py-16 lg:py-20">
      <div className="container-liguita">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Colonne Texte & Recherche (55%) */}
          <div className="lg:col-span-7">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-caption font-bold uppercase tracking-wider text-brand-700">
              <Sparkles size={14} className="text-brand-500" />
              <span>Plateforme tchadienne des objets perdus et retrouvés</span>
            </div>

            {/* H1 Titre */}
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
              J'ai trouvé.
              <br />
              Tu as perdu.
              <br />
              <span className="text-brand-500">On se retrouve.</span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-xl text-body-lg text-ink-700 sm:text-xl">
              Liguita vous aide à retrouver vos objets perdus ou à déclarer ceux que vous avez trouvés à N'Djamena et au Tchad. Simple, rapide et sécurisé.
            </p>

            {/* Barre de recherche */}
            <form
              onSubmit={handleSearch}
              className="mt-8 flex items-center rounded-full border border-ink-200 bg-white p-2 shadow-card transition-shadow hover:shadow-card-hover focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20"
            >
              <div className="flex items-center pl-4 text-ink-400">
                <Search size={22} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Que recherchez-vous ? (ex : CNI, sac, iPhone...)"
                aria-label="Rechercher un objet perdu ou trouvé"
                className="w-full bg-transparent px-3 py-2 text-body font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-transform hover:bg-brand-600 active:scale-95"
                aria-label="Lancer la recherche"
              >
                <ArrowRight size={20} />
              </button>
            </form>

            {/* Suggestions de recherche */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-caption font-medium text-ink-500">Exemples :</span>
              {SUGGESTIONS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSuggestionClick(term)}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1 text-caption font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Colonne Visuel Hero (45%) */}
          <div className="relative flex justify-center lg:col-span-5">
            <div className="relative mx-auto w-full max-w-md">
              {/* Cercle d'ambiance en arrière-plan */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-brand-100/40 via-amber-50/50 to-brand-50/30 blur-2xl" />

              {/* Image Hero */}
              <div className="relative overflow-hidden rounded-3xl">
                <Image
                  src="/hero-person.png"
                  alt="Utilisatrice Liguita avec son smartphone à N'Djamena"
                  width={500}
                  height={550}
                  priority
                  className="h-auto w-full object-cover"
                />
              </div>

              {/* Badge flottant Hero */}
              <div className="absolute -bottom-4 -left-4 rounded-2xl border border-ink-100 bg-white/95 p-4 shadow-elevated backdrop-blur-sm sm:-bottom-6 sm:-left-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="font-display text-body-sm font-bold text-ink-900">
                      Un objet perdu
                    </p>
                    <p className="text-caption text-ink-600">
                      peut toujours être retrouvé.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
