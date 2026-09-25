'use client';

import { useCallback, useEffect, useState } from 'react';

import { Alert, EmptyState, Skeleton } from '@liguita/ui';

import {
  listMyNotifications,
  markNotificationRead,
  type NotificationListItem,
} from '../../actions/notifications';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listMyNotifications();
    if (result.error) setError(result.error);
    else {
      setError(null);
      setItems(result.items);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    void load();
  }, [authLoading, load, user]);

  async function handleRead(id: string) {
    if (pendingId) return;
    setPendingId(id);
    const result = await markNotificationRead(id);
    if (result.ok) {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
      setError(null);
    } else {
      setError(result.error ?? 'Impossible de marquer la notification comme lue.');
    }
    setPendingId(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton variant="rect" className="h-16 w-full" />
        <Skeleton variant="rect" className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
          Notifications
        </h1>
        <p className="mt-1 text-body text-ink-600">
          Vos alertes de correspondance, de vérification et de paiement.
        </p>
      </div>

      {error ? (
        <Alert
          tone="danger"
          title="Notifications"
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="text-caption font-bold underline"
            >
              Réessayer
            </button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Vous serez averti dès qu'une correspondance ou une alerte de recherche est détectée."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                disabled={Boolean(notification.read_at) || pendingId === notification.id}
                onClick={() => void handleRead(notification.id)}
                className={`w-full rounded-2xl border p-4 text-left transition hover:border-brand-300 disabled:cursor-default ${
                  notification.read_at
                    ? 'border-ink-200 bg-white'
                    : 'border-brand-200 bg-brand-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-body-lg font-bold text-ink-950">
                    {notification.title}
                  </p>
                  <span className="shrink-0 text-caption text-ink-500">
                    {formatShortDate(notification.created_at)}
                  </span>
                </div>
                {notification.body ? (
                  <p className="mt-1 text-body-sm text-ink-600">{notification.body}</p>
                ) : null}
                <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                  {notification.kind} · {notification.read_at ? 'Lue' : 'Non lue'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
