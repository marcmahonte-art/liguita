import Link from 'next/link';
import { ArrowRight, Check, Gift, Link2, Package, type LucideIcon } from 'lucide-react';

import { formatMoney } from '@liguita/core/pricing';

import { TONES } from '../../../lib/icons';
import type { ActivityEvent, ActivityIcon } from '../../../lib/dashboard';

const ICONS: Record<ActivityIcon, LucideIcon> = {
  search: Package,
  package: Package,
  check: Check,
  link: Link2,
  gift: Gift,
};

/**
 * Temps relatif.
 *
 * ⚠️ `Date.now()` est utilisé sur un composant rendu côté serveur puis hydraté : l'écart
 * entre les deux instants est de l'ordre de la seconde, sans effet visible. Une
 * granularité à la minute produirait en revanche un écart visible entre les deux rendus.
 */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return `il y a ${Math.floor(days / 7)} sem.`;
}

/**
 * Activité récente — source unique.
 *
 * ⚠️ **Une seule section, une seule liste.** Les anciennes versions de cette page
 * affichaient « Mes dernières activités », « Transactions récentes » et « Notifications »
 * côte à côte : trois listes, trois tris, et les mêmes événements lus plusieurs fois.
 * Ici, un objet déclaré, une correspondance détectée et une récompense créditée vivent
 * dans le même flux, trié par date, et chaque ligne mène à l'endroit où l'action se fait.
 *
 * La ligne est compacte et horizontale : icône, nom, statut, date, montant éventuel,
 * action. Sur mobile, le montant passe sous le nom plutôt que de tronquer le titre.
 */
export function RecentActivityFeed({ events }: { events: readonly ActivityEvent[] }) {
  return (
    <section
      aria-labelledby="activite-titre"
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xs"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 id="activite-titre" className="font-display text-h3 font-bold text-ink-950">
          Activité récente
        </h2>
        <Link
          href="/app/objets"
          className="shrink-0 text-caption font-bold text-brand-600 hover:underline"
        >
          Tout voir
        </Link>
      </header>

      {events.length === 0 ? (
        <p className="px-4 pb-5 text-body text-ink-500 sm:px-5">
          Aucune activité pour le moment. Recherchez un objet ou déclarez une perte pour
          lancer la première recherche.
        </p>
      ) : (
        <ul className="flex flex-col border-t border-ink-100">
          {events.map((event) => {
            const Icon = ICONS[event.icon];
            return (
              <li key={event.id} className="border-b border-ink-100 last:border-b-0">
                <Link
                  href={event.href}
                  className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50 sm:px-5"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONES[event.tone]}`}
                    aria-hidden
                  >
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="truncate font-display text-body font-bold text-ink-950">
                        {event.title}
                      </span>
                      {/* Le statut est écrit, jamais seulement coloré. */}
                      <span className="text-caption font-bold text-ink-500">{event.status}</span>
                    </span>
                    <span className="mt-0.5 block text-caption text-ink-500 sm:hidden">
                      {timeAgo(event.occurredAt)}
                      {event.amountXaf !== undefined ? ` · ${formatMoney(event.amountXaf)}` : ''}
                    </span>
                  </span>

                  <span className="hidden shrink-0 text-right sm:block">
                    {event.amountXaf !== undefined ? (
                      <span className="block font-display text-body font-extrabold tabular text-success-700">
                        {formatMoney(event.amountXaf)}
                      </span>
                    ) : null}
                    <span className="block text-caption text-ink-500">
                      {timeAgo(event.occurredAt)}
                    </span>
                  </span>

                  <ArrowRight size={16} aria-hidden className="shrink-0 text-ink-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
