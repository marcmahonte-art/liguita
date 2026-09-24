import Link from 'next/link';

import { formatShortDate } from '../../../lib/format';
import { KIND_META, STATUS_META, TONES, categoryIcon } from '../../../lib/icons';
import type { Item } from '../../../types';

interface RecentActivitiesProps {
  items: readonly Item[];
}

/**
 * Mes dernières activités.
 *
 * Les badges de type et de statut portent chacun un libellé textuel : la couleur renforce
 * la lecture, elle ne la remplace jamais. Un utilisateur qui ne distingue pas le vert du
 * rouge doit pouvoir lire « Objet trouvé » et « Restitué » sans ambiguïté.
 *
 * Les icônes sont des SVG Lucide et non des emojis : leur rendu est identique sur tous
 * les systèmes, contrairement aux emojis qui dépendent de la police du téléphone.
 */
export function RecentActivities({ items }: RecentActivitiesProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
        <p className="font-display text-body-lg font-bold text-ink-950">
          Mes dernières activités
        </p>
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
          const kind = KIND_META[item.kind] ?? {
            label: item.kind,
            icon: categoryIcon(item.categoryId),
            tone: 'neutral' as const,
          };
          const status = STATUS_META[item.status] ?? {
            label: item.status,
            tone: 'neutral' as const,
          };
          const KindIcon = kind.icon;
          const ItemIcon = categoryIcon(item.categoryId);

          return (
            <li key={item.id}>
              <Link
                href="/app/objets"
                className="flex items-center gap-3 py-3 transition hover:opacity-80"
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${TONES[kind.tone]}`}
                  aria-hidden
                >
                  <ItemIcon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold ${TONES[kind.tone]}`}
                    >
                      <KindIcon size={11} aria-hidden />
                      {kind.label}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-2xs font-bold ${TONES[status.tone]}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-display text-body font-bold text-ink-950">
                    {item.title}
                  </p>
                  <p className="text-2xs text-ink-500">
                    {item.placeLabel} · {formatShortDate(item.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-ink-400" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
