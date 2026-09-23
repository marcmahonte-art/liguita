import { ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function ActionCardsSection() {
  return (
    <section className="py-10 sm:py-14">
      <div className="container-liguita">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Carte 1 : J'ai perdu un objet */}
          <Link
            href="/declarer/perdu"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-brand-200/80 bg-[#FFF5F5] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-card sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <HelpCircle size={28} />
              </div>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight size={20} />
              </span>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
                J'ai perdu un objet
              </h2>
              <p className="mt-2.5 max-w-md text-body text-ink-700">
                Déclarez votre objet perdu en quelques étapes. Notre moteur calcule instantanément les correspondances et vous alerte.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 font-display text-body-sm font-bold text-brand-700">
                <span>Déclarer ma perte</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>

          {/* Carte 2 : J'ai trouvé un objet */}
          <Link
            href="/declarer/trouve"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-200/80 bg-[#F1FBF6] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-card sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Sparkles size={28} />
              </div>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight size={20} />
              </span>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
                J'ai trouvé un objet
              </h2>
              <p className="mt-2.5 max-w-md text-body text-ink-700">
                Signalez l'objet trouvé en 3 champs simples. Restituez-le à son propriétaire vérifié et recevez votre récompense financière.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 font-display text-body-sm font-bold text-emerald-700">
                <span>Publier l'objet trouvé</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
