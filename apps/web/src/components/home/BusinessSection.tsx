import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Hotel,
  Plane,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

const BUSINESS_TYPES = [
  { label: 'Aéroports', icon: Plane },
  { label: 'Hôtels & Résidences', icon: Hotel },
  { label: 'Universités & Écoles', icon: GraduationCap },
  { label: 'Supermarchés & Centres', icon: ShoppingBag },
  { label: 'Gares & Agences de voyage', icon: Truck },
  { label: 'Institutions & Entreprises', icon: Building2 },
];

export function BusinessSection() {
  return (
    <section className="overflow-hidden py-16 sm:py-24">
      <div className="container-liguita">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Colonne texte (7 cols) */}
          <div className="lg:col-span-7">
            <span className="inline-flex rounded-full bg-ink-100 px-3 py-1 font-display text-caption font-bold uppercase tracking-wider text-ink-700">
              Liguita Business
            </span>

            <h2 className="mt-4 font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
              Votre établissement gère des objets trouvés ?
            </h2>

            <p className="mt-4 text-body-lg text-ink-700">
              Aéroports, gares, hôtels, agences de transport et universités : centralisez votre inventaire d'objets trouvés, automatisez le matching avec les déclarations publiques et restituez les biens à leurs propriétaires légitimes en toute conformité.
            </p>

            {/* Badges d'établissements cibles */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BUSINESS_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white p-3 text-caption font-semibold text-ink-800 shadow-2xs"
                  >
                    <Icon size={18} className="text-brand-500 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/business"
                className={buttonClasses({ variant: 'primary', size: 'lg' })}
              >
                <span>Découvrir l'espace Entreprises</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Colonne aperçu visuel Dashboard Business (5 cols) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-ink-200 bg-ink-950 p-6 text-white shadow-elevated sm:p-8">
              {/* En-tête de l'aperçu */}
              <div className="flex items-center justify-between border-b border-ink-800 pb-4">
                <div>
                  <p className="font-display text-body-sm font-bold text-white">
                    Aéroport International Hassan Djamous
                  </p>
                  <p className="text-caption text-ink-400">
                    Console objets trouvés · N'Djamena
                  </p>
                </div>
                <span className="flex size-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Indicateurs clés */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-ink-900/90 p-4 border border-ink-800">
                  <p className="text-caption text-ink-400">Objets enregistrés</p>
                  <p className="font-display text-2xl font-extrabold text-white mt-1">24</p>
                </div>
                <div className="rounded-2xl bg-ink-900/90 p-4 border border-ink-800">
                  <p className="text-caption text-ink-400">Restitués ce mois</p>
                  <p className="font-display text-2xl font-extrabold text-emerald-400 mt-1">19</p>
                </div>
              </div>

              {/* Exemple d'activité récente */}
              <div className="mt-6 space-y-3">
                <p className="text-caption font-bold uppercase tracking-wider text-ink-400">
                  Correspondances récentes
                </p>

                <div className="flex items-center justify-between rounded-xl bg-ink-900/60 p-3 border border-ink-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-caption font-bold">
                      94%
                    </span>
                    <div>
                      <p className="text-caption font-bold text-white">Passeport Tchadien</p>
                      <p className="text-2xs text-ink-400">Zone départ · Correspondance confirmée</p>
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-ink-900/60 p-3 border border-ink-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 text-caption font-bold">
                      88%
                    </span>
                    <div>
                      <p className="text-caption font-bold text-white">Sacoche en cuir noir</p>
                      <p className="text-2xs text-ink-400">Hall principal · Vérification en cours</p>
                    </div>
                  </div>
                  <span className="text-2xs text-amber-400 font-semibold">En cours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
