import { Gift, Handshake, MapPin, Star } from 'lucide-react';
import Link from 'next/link';

import type { DashboardStats } from '../../../types';
import { TONES, type Tone } from '../../../lib/icons';

interface StatRow {
  label: string;
  value: string | number;
  href: string;
  Icon: typeof Gift;
  tone: Tone;
}

interface StatsWidgetProps {
  stats: DashboardStats;
}

/**
 * Mes statistiques.
 *
 * ⚠️ Les valeurs viennent de `stats`, jamais du composant (spec §14). Une valeur écrite
 * en dur ici finirait par contredire les données réelles sans que personne ne s'en
 * aperçoive, puisque l'écart serait visuellement plausible.
 */
export function StatsWidget({ stats }: StatsWidgetProps) {
  const rows: StatRow[] = [
    {
      label: 'Objets trouvés',
      value: stats.foundCount,
      href: '/app/objets',
      Icon: Gift,
      tone: 'found',
    },
    {
      label: 'Objets perdus',
      value: stats.lostCount,
      href: '/app/objets',
      Icon: MapPin,
      tone: 'lost',
    },
    {
      label: 'Mises en relation',
      value: stats.connectionsCount,
      href: '/app/transactions',
      Icon: Handshake,
      tone: 'info',
    },
    {
      label: 'Ma note',
      /* `null` signifie « pas encore de note », et non « zéro » : un compte neuf n'a pas
         été mal noté, il n'a simplement pas encore été évalué. */
      value: stats.rating !== null ? stats.rating.toFixed(1) : '—',
      href: '/app/profil',
      Icon: Star,
      tone: 'pending',
    },
  ];

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <p className="text-caption font-bold uppercase tracking-wide text-ink-500">
        Mes statistiques
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => {
          const Icon = row.Icon;
          return (
            <li key={row.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[row.tone]}`}
                  aria-hidden
                >
                  <Icon size={16} />
                </span>
                <div>
                  <p className="font-display text-body-lg font-extrabold text-ink-950">
                    {row.value}
                  </p>
                  <p className="text-2xs text-ink-500">{row.label}</p>
                </div>
              </div>
              <Link
                href={row.href}
                className="text-caption font-bold text-brand-600 hover:underline"
              >
                → Voir
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
