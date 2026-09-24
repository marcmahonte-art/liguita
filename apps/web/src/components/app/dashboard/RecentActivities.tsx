import Link from 'next/link';

import { formatShortDate } from '../../../lib/format';
import type { Item } from '../../../types';

const KIND_LABEL: Record<string, { text: string; color: string }> = {
  FOUND: { text: 'Objet trouvé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOST: { text: 'Objet perdu', color: 'bg-red-50 text-red-700 border-red-200' },
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publié',
  MATCHED: 'Correspondance',
  IN_VERIFICATION: 'En vérification',
  PAID: 'Payé',
  RETURNED: 'Restitué',
  EXPIRED: 'Expiré',
  CLOSED: 'Fermé',
  DRAFT: 'Brouillon',
};

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: 'bg-sky-50 text-sky-700 border-sky-200',
  MATCHED: 'bg-violet-50 text-violet-700 border-violet-200',
  IN_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RETURNED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-ink-50 text-ink-500 border-ink-200',
  CLOSED: 'bg-ink-50 text-ink-500 border-ink-200',
};

const ITEM_EMOJI: Record<string, string> = {
  'bag-wallet': '👛',
  'phone-smartphone': '📱',
  'doc-national-id': '🪪',
  keys: '🔑',
};

interface RecentActivitiesProps {
  items: readonly Item[];
}

export function RecentActivities({ items }: RecentActivitiesProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="font-display text-body-lg font-bold text-ink-950">
            Mes dernières activités
          </p>
        </div>
        <p className="mt-4 text-body text-ink-500">
          Aucune activité pour le moment. Publiez votre première déclaration&nbsp;!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="font-display text-body-lg font-bold text-ink-950">Mes dernières activités</p>
        <Link href="/app/objets" className="text-caption font-bold text-brand-600 hover:underline">
          Voir tout →
        </Link>
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-ink-100">
        {items.map((item) => {
          const kind = KIND_LABEL[item.kind] ?? { text: item.kind, color: 'bg-ink-50 text-ink-600 border-ink-200' };
          const statusLabel = STATUS_LABEL[item.status] ?? item.status;
          const statusColor = STATUS_COLOR[item.status] ?? 'bg-ink-50 text-ink-500 border-ink-200';
          const emoji = ITEM_EMOJI[item.categoryId] ?? '📦';

          return (
            <li key={item.id}>
              <Link
                href="/app/objets"
                className="flex items-center gap-3 py-3 transition hover:opacity-80"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-2xl">
                  {emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-bold ${kind.color}`}
                    >
                      {kind.text}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-bold ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 font-display text-body font-bold text-ink-950 truncate">
                    {item.title}
                  </p>
                  <p className="text-2xs text-ink-500">
                    {item.citySlug?.replace(/-/g, ' ')} · {item.placeLabel} ·{' '}
                    {formatShortDate(item.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-ink-300" aria-hidden>›</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
