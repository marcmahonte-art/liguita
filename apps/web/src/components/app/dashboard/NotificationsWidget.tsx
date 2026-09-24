import Link from 'next/link';

import { notificationMeta, TONES } from '../../../lib/icons';
import type { AppNotification } from '../../../types';

/**
 * Temps relatif.
 *
 * ⚠️ Calculé à partir de `Date.now()`. Ce composant est rendu côté serveur puis hydraté
 * côté client : l'écart entre les deux instants est de l'ordre de la seconde, donc sans
 * effet visible sur un affichage en heures ou en jours. Une granularité à la minute
 * aurait en revanche pu produire un écart d'affichage entre serveur et client.
 *
 * Le jour de bascule est calculé sur 24 h pleines : « il y a 1 j » signifie « il y a
 * plus de 24 heures », et non « la date d'hier ».
 */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'il y a moins d’une heure';
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'il y a 1 jour' : `il y a ${days} jours`;
}

interface NotificationsWidgetProps {
  notifications: readonly AppNotification[];
}

/**
 * Notifications.
 *
 * ⚠️ **Correction apportée.** Les pastilles étaient toutes en `bg-emerald-100` : une
 * correspondance, un paiement confirmé et une récompense reçue avaient exactement la
 * même apparence, alors que ce sont trois événements de nature différente. La couleur
 * et l'icône distinguent maintenant les natures.
 *
 * Le composant n'expose aucune donnée de vérification (spec §17) : il n'affiche que le
 * titre et la description fournis, qui sont déjà rédigés pour être publics.
 */
export function NotificationsWidget({ notifications }: NotificationsWidgetProps) {
  const preview = notifications.slice(0, 4);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="font-display text-body-lg font-bold text-ink-950">Notifications</p>
        <Link
          href="/app/notifications"
          className="text-caption font-bold text-brand-600 hover:underline"
        >
          Voir tout →
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="mt-4 text-body text-ink-500">Aucune notification.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {preview.map((notification) => {
            const meta = notificationMeta(notification.kind);
            const Icon = meta.icon;

            return (
              <li key={notification.id}>
                <Link
                  href={notification.href ?? '/app/notifications'}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition hover:border-brand-300 ${
                    notification.isRead ? 'border-ink-100 bg-white' : 'border-brand-200 bg-brand-50/40'
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TONES[meta.tone]}`}
                    aria-hidden
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-body font-bold text-ink-950">
                      {notification.title}
                    </p>
                    {notification.description ? (
                      <p className="mt-0.5 line-clamp-2 text-2xs text-ink-500">
                        {notification.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-2xs text-ink-500">
                      {timeAgo(notification.occurredAt)}
                      {/* Le statut de lecture est écrit en toutes lettres : la seule
                          différence de fond ne suffirait pas à le signaler. */}
                      {!notification.isRead ? (
                        <span className="ml-1.5 font-bold text-brand-700">· Non lue</span>
                      ) : null}
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
      )}
    </div>
  );
}
