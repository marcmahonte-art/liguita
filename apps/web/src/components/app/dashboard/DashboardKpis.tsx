import Link from 'next/link';
import { Check, Gift, MapPin, Package, type LucideIcon } from 'lucide-react';

import { TONES } from '../../../lib/icons';
import type { DashboardKpi } from '../../../lib/dashboard';

const ICONS: Record<DashboardKpi['icon'], LucideIcon> = {
  search: MapPin,
  package: Package,
  check: Check,
  gift: Gift,
};

/**
 * Les quatre indicateurs — une seule ligne, une seule surface.
 *
 * ⚠️ Pas de carte par chiffre. Quatre cartes séparées sur un écran large produisent
 * quatre colonnes de 300 px séparées par du vide, et obligent l'œil à sauter d'un chiffre
 * à l'autre pour les comparer. Ici, une surface continue divisée par des filets : la
 * comparaison est immédiate, la hauteur tient sur une ligne.
 *
 * Chaque chiffre est un lien vers la page qui l'explique en détail. Le tableau de bord
 * donne l'ordre de grandeur ; il n'est pas censé être la source exhaustive.
 */
export function DashboardKpis({ kpis }: { kpis: readonly DashboardKpi[] }) {
  return (
    <section aria-label="Indicateurs" className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xs">
      <ul className="grid grid-cols-2 md:grid-cols-4">
        {kpis.map((kpi, index) => {
          const Icon = ICONS[kpi.icon];
          return (
            <li
              key={kpi.id}
              className={
                index % 2 === 1
                  ? 'border-l border-ink-100'
                  : index >= 2
                    ? 'border-t border-ink-100 md:border-t-0 md:border-l'
                    : undefined
              }
            >
              <Link
                href={kpi.href}
                className="group flex min-h-[92px] flex-col justify-center gap-1.5 px-4 py-4 transition-colors hover:bg-ink-50 sm:px-5"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${TONES[kpi.tone]}`}
                    aria-hidden
                  >
                    <Icon size={15} />
                  </span>
                  <span className="text-caption font-bold text-ink-500">{kpi.label}</span>
                </span>
                <span className="font-display text-[26px] font-extrabold leading-none tabular text-ink-950">
                  {kpi.value}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
