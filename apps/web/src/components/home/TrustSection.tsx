import { Award, Lock, MapPin, Smartphone } from 'lucide-react';

const STATS = [
  {
    icon: MapPin,
    value: '22',
    label: 'Quartiers de N\'Djamena',
    description: 'De Chagoua à Farcha, couverture complète de la capitale.',
  },
  {
    icon: Lock,
    value: '100%',
    label: 'Propriété vérifiée',
    description: 'Questions secrètes et anti-fraude avant toute mise en relation.',
  },
  {
    icon: Smartphone,
    value: 'Airtel & Moov',
    label: 'Paiement local',
    description: 'Règlement simple via Mobile Money ou en espèces dans nos points relais.',
  },
  {
    icon: Award,
    value: '300 FCFA',
    label: 'Tarif accessible',
    description: 'Une commission juste et transparente partagée avec le trouveur.',
  },
];

export function TrustSection() {
  return (
    <section className="border-t border-ink-200/80 bg-gradient-to-b from-white to-ink-50/50 py-16 sm:py-20">
      <div className="container-liguita">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-display text-caption font-bold uppercase tracking-wider text-brand-700">
            Pensé pour le Tchad
          </span>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Une plateforme fiable, sécurisée et solidaire
          </h2>
          <p className="mt-3 text-body-lg text-ink-600">
            Conçue pour rapprocher les personnes et encourager l'honnêteté civique avec une juste récompense.
          </p>
        </div>

        {/* Grille des 4 piliers */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-2xl border border-ink-200/80 bg-white p-6 text-center shadow-2xs"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={24} />
                </div>
                <p className="mt-4 font-display text-2xl font-extrabold text-ink-950">
                  {stat.value}
                </p>
                <p className="font-display text-body-sm font-bold text-ink-800">
                  {stat.label}
                </p>
                <p className="mt-2 text-caption text-ink-600">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
