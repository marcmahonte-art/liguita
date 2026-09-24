import Link from 'next/link';

import type { AppNotification } from '../../../types';

const KIND_EMOJI: Record<string, string> = {
  MATCH_FOUND: '✅',
  ITEM_RETURNED: '📦',
  CONNECTION_ACTIVATED: '🔗',
  PAYMENT_CONFIRMED: '💚',
  REWARD_RECEIVED: '🌟',
  SYSTEM: '📣',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'il y a < 1 h';
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

interface NotificationsWidgetProps {
  notifications: readonly AppNotification[];
}

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
          {preview.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href ?? '/app/notifications'}
                className={`flex items-start gap-3 rounded-xl border p-3 transition hover:border-brand-300 ${
                  n.isRead ? 'border-ink-100 bg-white' : 'border-brand-200 bg-brand-50/40'
                }`}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base"
                  aria-hidden
                >
                  {KIND_EMOJI[n.kind] ?? '📣'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-body font-bold text-ink-950 truncate">
                    {n.title}
                  </p>
                  {n.description && (
                    <p className="mt-0.5 text-2xs text-ink-500 line-clamp-2">{n.description}</p>
                  )}
                  <p className="mt-1 text-2xs text-ink-400">{timeAgo(n.occurredAt)}</p>
                </div>
                <span className="shrink-0 text-ink-300" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
