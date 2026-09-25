import Link from 'next/link';
import { ArrowRight, BellOff, Megaphone } from 'lucide-react';

import { notificationMeta, TONES } from '../../../lib/icons';
import type { NotificationListItem } from '../../../app/actions/notifications';

/**
 * Notifications — uniquement ce qui demande une action.
 *
 * ⚠️ **Deux exclusions, non négociables.**
 *
 *  · Les notifications **lues** : une information déjà traitée n'a plus rien à faire
 *    demander. Les conserver ici enverrait le tableau de bord dans une file de tâches
 *    déjà traitées.
 *  · Les **confirmations financières** : leur détail est dans Transactions. Les afficher
 *    aussi ici créerait une deuxième source de vérité sur l'argent — exactement la
 *    duplication que la règle du produit interdit.
 *
 * Au-delà de deux éléments, la liste cesse d'être lisible en un coup d'œil et la
 * troisième ligne repousse le bas de l'écran. Le reste vit dans la page dédiée.
 */
export function DashboardNotificationsPanel({
  notifications,
}: {
  notifications: readonly NotificationListItem[];
}) {
  return (
    <section
      aria-labelledby="notifications-titre"
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xs"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 id="notifications-titre" className="font-display text-h3 font-bold text-ink-950">
          À traiter
        </h2>
        <Link
          href="/app/notifications"
          className="shrink-0 text-caption font-bold text-brand-600 hover:underline"
        >
          Tout voir
        </Link>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-1 items-center gap-3 border-t border-ink-100 px-4 py-5 sm:px-5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500"
            aria-hidden
          >
            <BellOff size={17} />
          </span>
          <p className="text-body text-ink-500">Rien à traiter pour le moment.</p>
        </div>
      ) : (
        <ul className="flex flex-col border-t border-ink-100">
          {notifications.map((notification) => {
            const meta = notificationMeta(notification.kind);
            const Icon = meta.icon;
            return (
              <li key={notification.id} className="border-b border-ink-100 last:border-b-0">
                <Link
                  href="/app/notifications"
                  className="flex min-h-[68px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50 sm:px-5"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONES[meta.tone]}`}
                    aria-hidden
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-body font-bold text-ink-950">
                      {notification.title}
                    </span>
                    {notification.body ? (
                      <span className="mt-0.5 block truncate text-caption text-ink-500">
                        {notification.body}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight size={16} aria-hidden className="shrink-0 text-ink-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-auto flex items-center gap-2 border-t border-ink-100 px-4 py-3 text-caption text-ink-500 sm:px-5">
        <Megaphone size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1">
          Les alertes de paiement et de récompense sont dans Transactions.
        </span>
      </footer>
    </section>
  );
}
