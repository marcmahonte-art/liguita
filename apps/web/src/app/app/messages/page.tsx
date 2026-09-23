'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge, buttonClasses, EmptyState, Skeleton } from '@liguita/ui';

import { listMyConversations, type ConversationListItem } from '../../actions/conversations';
import { useAuth } from '../../../lib/auth/auth-context';
import { formatShortDate } from '../../../lib/format';

const STATUS_LABEL: Record<string, { label: string; tone: 'pending' | 'found' | 'neutral' }> = {
  OPEN: { label: 'En cours', tone: 'pending' },
  RETURN_PENDING: { label: 'Restitution à confirmer', tone: 'pending' },
  RETURNED: { label: 'Restitué', tone: 'found' },
  CLOSED: { label: 'Fermé', tone: 'neutral' },
  DISPUTED: { label: 'Litige', tone: 'neutral' },
};

const DEFAULT_STATUS = { label: 'En cours', tone: 'pending' as const };

export default function MessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    listMyConversations()
      .then((result) => {
        if (cancelled) return;
        if (result.error) setError(result.error);
        else setItems(result.items);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Impossible de charger les messages.');
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">Messages</h1>
        <p className="mt-1 text-body text-ink-600">
          Échangez avec l’autre partie et organisez la restitution en toute sécurité.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="rect" className="h-20 w-full" />
          <Skeleton variant="rect" className="h-20 w-full" />
        </div>
      ) : error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-body text-danger-800"
        >
          {error}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune conversation"
          description="Une conversation s’ouvre après la validation de la propriété d’une correspondance."
          action={
            <Link href="/app/correspondances" className={buttonClasses({ variant: 'primary' })}>
              Voir mes correspondances
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = STATUS_LABEL[item.status] ?? DEFAULT_STATUS;
            return (
              <li key={item.id}>
                <Link
                  href={`/app/messages/${item.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-card"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <MessageCircle size={20} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-body-lg font-bold text-ink-950">
                        {item.title}
                      </h2>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 truncate text-body-sm text-ink-600">
                      {item.counterpartName
                        ? `Avec ${item.counterpartName}`
                        : 'Mise en relation sécurisée'}
                      {item.citySlug ? ` · ${item.citySlug.replace(/-/g, ' ')}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-caption text-ink-500">
                    {formatShortDate(item.updatedAt)}
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
