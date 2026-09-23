'use client';

import { useEffect, useState } from 'react';

import { EmptyState, Skeleton } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';
import { createClient } from '../../../lib/supabase/client';
import { formatShortDate } from '../../../lib/format';

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('notifications')
      .select('id, kind, title, body, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          setItems((data ?? []) as NotificationRow[]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

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
      <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
        Notifications
      </h1>

      {items.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Vous serez averti dès qu'une correspondance ou une alerte de recherche est détectée."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.read_at ? 'border-ink-200 bg-white' : 'border-brand-200 bg-brand-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-body-lg font-bold text-ink-950">{n.title}</p>
                <span className="shrink-0 text-caption text-ink-500">
                  {formatShortDate(n.created_at)}
                </span>
              </div>
              {n.body ? <p className="mt-1 text-body-sm text-ink-600">{n.body}</p> : null}
              <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                {n.kind}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
