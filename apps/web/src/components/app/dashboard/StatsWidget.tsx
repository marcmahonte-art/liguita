import Link from 'next/link';

import type { DashboardStats } from '../../../types';

interface StatRow {
  emoji: string;
  label: string;
  value: string | number;
  href: string;
}

interface StatsWidgetProps {
  stats: DashboardStats;
}

export function StatsWidget({ stats }: StatsWidgetProps) {
  const rows: StatRow[] = [
    { emoji: '🎁', label: 'Objets trouvés', value: stats.foundCount, href: '/app/objets' },
    { emoji: '📍', label: 'Objets perdus', value: stats.lostCount, href: '/app/objets' },
    {
      emoji: '🤝',
      label: 'Mises en relation',
      value: stats.connectionsCount,
      href: '/app/transactions',
    },
    {
      emoji: '⭐',
      label: 'Ma note',
      value: stats.rating !== null ? stats.rating.toFixed(1) : '—',
      href: '/app/profil',
    },
  ];

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <p className="text-caption font-bold uppercase tracking-wide text-ink-500">
        Mes statistiques
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {row.emoji}
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
        ))}
      </ul>
    </div>
  );
}
