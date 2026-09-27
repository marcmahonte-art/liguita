'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  LockKeyhole,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { Alert, Badge, buttonClasses, Input, Skeleton } from '@liguita/ui';

import {
  confirmReturn,
  getConversation,
  sendMessage,
  updateReturnPlan,
  type ConversationMessage,
  type ConversationView,
} from '../../../actions/conversations';
import { getFinderContact, type FinderContactState } from '../../../actions/payments';
import { useAuth } from '../../../../lib/auth/auth-context';
import { createClient } from '../../../../lib/supabase/client';
import { formatShortDate } from '../../../../lib/format';

function toInputDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [place, setPlace] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isPending, startTransition] = useTransition();
  const [contact, setContact] = useState<FinderContactState | null>(null);

  const conversationId = params.id;

  const load = useCallback(async () => {
    if (!conversationId) return;
    const result = await getConversation(conversationId);
    if (result.error) setError(result.error);
    if (result.conversation) {
      setConversation(result.conversation);
      setMessages(result.conversation.messages);
      setPlace(result.conversation.returnPlace ?? '');
      setScheduledAt(toInputDate(result.conversation.returnScheduledAt));

      // Le chercheur seul reçoit les coordonnées du trouveur, et seulement
      // après paiement confirmé (règle appliquée en base par
      // `get_finder_contact`). Le trouveur, lui, n'en a pas besoin.
      if (result.conversation.isOwner) {
        const resolved = await getFinderContact(result.conversation.matchId);
        setContact(resolved);
      }
    }
    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (authLoading || !user || !conversationId) return;
    let cancelled = false;
    void load();
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          if (!cancelled) void load();
        },
      )
      .subscribe();
    const onFocus = () => {
      if (!cancelled) void load();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [authLoading, conversationId, load, user]);

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || isPending) return;
    startTransition(async () => {
      const result = await sendMessage(conversationId, body);
      if (!result.ok) setError(result.error ?? 'Envoi impossible.');
      else {
        setBody('');
        setError(null);
        await load();
      }
    });
  }

  function handleConfirm() {
    if (!conversation || isPending) return;
    startTransition(async () => {
      const result = await confirmReturn(conversationId, conversation.isOwner ? 'OWNER' : 'FINDER');
      if (!result.ok) setError(result.error ?? 'Confirmation impossible.');
      else {
        setError(null);
        await load();
      }
    });
  }

  function handlePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    startTransition(async () => {
      const result = await updateReturnPlan(conversationId, place, scheduledAt);
      if (!result.ok) setError(result.error ?? 'Enregistrement impossible.');
      else {
        setError(null);
        await load();
      }
    });
  }

  if (isLoading || authLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton variant="rect" className="h-8 w-48" />
        <Skeleton variant="rect" className="h-64 w-full" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="space-y-4">
        <Link href="/app/messages" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft size={16} /> Retour aux messages
        </Link>
        <Alert tone="danger" title={error ?? 'Conversation indisponible.'} />
      </div>
    );
  }

  const alreadyConfirmed = conversation.isOwner
    ? Boolean(conversation.ownerConfirmedAt)
    : Boolean(conversation.finderConfirmedAt);
  const returned = conversation.status === 'RETURNED';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/messages" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft size={16} /> Messages
        </Link>
        <Badge tone={returned ? 'found' : 'pending'}>
          {returned
            ? 'Restitution confirmée'
            : conversation.status === 'RETURN_PENDING'
              ? 'Double confirmation'
              : 'Mise en relation'}
        </Badge>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
        <h1 className="font-display text-xl font-extrabold text-ink-950 sm:text-2xl">
          {conversation.title}
        </h1>
        <p className="mt-1 text-body-sm text-ink-600">
          {conversation.citySlug
            ? conversation.citySlug.replace(/-/g, ' ')
            : 'Dossier sécurisé Liguita'}
        </p>
        {conversation.returnPlace || conversation.returnScheduledAt ? (
          <p className="mt-3 rounded-xl bg-ink-50 p-3 text-body-sm text-ink-700">
            {conversation.returnPlace ?? 'Lieu à définir'}
            {conversation.returnScheduledAt
              ? ` · ${formatShortDate(conversation.returnScheduledAt)}`
              : ''}
          </p>
        ) : null}
      </div>

      {error ? <Alert tone="danger" title={error} /> : null}

      {/* Coordonnées du trouveur, chercheur uniquement, après paiement. */}
      {conversation.isOwner && contact ? <FinderContactCard contact={contact} /> : null}

      {returned ? (
        <Alert tone="success" title="Restitution confirmée par les deux parties." />
      ) : null}
      {conversation.status === 'RETURN_PENDING' ? (
        <Alert
          tone="info"
          title="Une confirmation reste nécessaire avant de clôturer la restitution."
        />
      ) : null}

      <section
        className="min-h-72 space-y-3 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5"
        aria-label="Fil de discussion"
      >
        {messages.length === 0 ? (
          <p className="text-body-sm text-ink-500">Aucun message pour le moment.</p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.isSystem
                  ? 'border border-brand-100 bg-brand-50 text-brand-900'
                  : message.isMine
                    ? 'bg-ink-950 text-white'
                    : 'bg-ink-50 text-ink-900'
              }`}
            >
              <p className="text-2xs font-bold opacity-70">
                {message.isSystem ? 'Liguita' : message.isMine ? 'Vous' : message.senderName}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm">{message.body}</p>
              {message.flagged ? (
                <p className="mt-2 flex items-center gap-1 text-2xs font-semibold text-warning-700">
                  <AlertTriangle size={12} aria-hidden /> Message signalé pour examen
                </p>
              ) : null}
              <p className="mt-1 text-right text-2xs opacity-60">
                {formatShortDate(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={handleSend} className="space-y-2">
        <label className="flex flex-col gap-2">
          <span className="text-caption font-bold text-ink-700">Votre message</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Écrivez un message…"
            maxLength={2000}
            disabled={
              isPending || conversation.status === 'CLOSED' || conversation.status === 'DISPUTED'
            }
            className="min-h-28 w-full resize-y rounded-lg border border-ink-400 bg-white px-4 py-3 font-body text-body text-ink-900 placeholder:text-ink-500 focus:border-ink-900 focus:outline-none focus:shadow-focus disabled:bg-ink-50 disabled:text-ink-400"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1 text-2xs text-ink-500">
            <LockKeyhole size={12} aria-hidden /> Ne partagez pas de données sensibles.
          </p>
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
          >
            <Send size={15} /> Envoyer
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50/30 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-body-lg font-bold text-ink-950">
            Restitution sécurisée
          </h2>
          <p className="mt-1 text-body-sm text-ink-600">
            Confirmez uniquement après la remise effective. Les deux confirmations sont
            obligatoires.
          </p>
        </div>
        {conversation.status !== 'RETURNED' ? (
          <form onSubmit={handlePlan} className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Lieu de remise"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Ex. marché central"
            />
            <Input
              label="Date et heure"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            <button
              type="submit"
              disabled={isPending}
              className={`sm:col-span-2 ${buttonClasses({ variant: 'outline', size: 'sm' })}`}
            >
              Enregistrer le rendez-vous
            </button>
          </form>
        ) : null}
        {conversation.status !== 'RETURNED' ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || alreadyConfirmed}
            className={buttonClasses({ variant: 'primary' })}
          >
            <ShieldCheck size={16} />
            {conversation.isOwner ? 'Confirmer la restitution' : 'Oui, j’ai remis l’objet'}
          </button>
        ) : (
          <p className="flex items-center gap-2 text-body-sm font-semibold text-success-700">
            <Check size={16} aria-hidden /> Dossier confirmé
          </p>
        )}
      </section>

      <p className="text-2xs text-ink-500">
        Après paiement confirmé, Liguita transmet le numéro du trouveur afin que vous puissiez
        convenir directement de la restitution — à condition qu’il ait donné son accord à
        l’inscription. Cette conversation reste ouverte et conserve l’historique, utile en cas de
        litige. Les messages contenant un signal de sortie de plateforme sont conservés et
        transmis à la modération pour examen.
      </p>
    </div>
  );
}

/**
 * Coordonnées du trouveur, affichées au seul chercheur après paiement.
 *
 * Trois cas, tous décidés côté base par `get_finder_contact()` :
 *  · `PAYMENT_REQUIRED` — le paiement n'est pas encore confirmé ;
 *  · `NO_CONSENT` — le trouveur a refusé (ou retiré) la divulgation ;
 *  · `NO_PHONE` — aucun numéro exploitable sur son profil.
 * Dans ces deux derniers cas, la conversation reste le seul canal : on
 * l'explique plutôt que de laisser un vide.
 */
function FinderContactCard({ contact }: { contact: FinderContactState }) {
  const [copied, setCopied] = useState(false);

  if (contact.status !== 'AVAILABLE' || !contact.finderPhone) {
    const message =
      contact.reason === 'NO_CONSENT'
        ? {
            title: 'Le trouveur n’a pas autorisé la transmission de son numéro',
            body: 'Il a retiré son accord, ou ne l’a pas donné à l’inscription. Convenez de la restitution par la messagerie ci-dessous — il reçoit vos messages.',
          }
        : contact.reason === 'NO_PHONE'
          ? {
              title: 'Aucun numéro disponible pour ce trouveur',
              body: 'Son profil ne comporte pas de numéro joignable. Utilisez la messagerie ci-dessous pour organiser la restitution.',
            }
          : {
              title: 'Le numéro sera communiqué après confirmation du paiement',
              body: 'Dès que l’opérateur confirme votre règlement, les coordonnées du trouveur apparaissent ici automatiquement.',
            };

    return (
      <section className="rounded-2xl border border-ink-200 bg-ink-50/60 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-body-lg font-bold text-ink-950">
          <LockKeyhole size={18} className="text-ink-600" />
          {message.title}
        </h2>
        <p className="mt-2 text-body-sm text-ink-600">{message.body}</p>
      </section>
    );
  }

  const displayPhone = contact.finderPhone.startsWith('+')
    ? contact.finderPhone
    : `+235 ${contact.finderPhone}`;
  // `tel:` exige un format sans espaces ni parenthèses.
  const dialable = displayPhone.replace(/[\s().-]/g, '');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayPhone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : le numéro reste
      // lisible et sélectionnable à l'écran.
    }
  }

  return (
    <section className="rounded-2xl border border-success-200 bg-success-50/60 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-body-lg font-bold text-ink-950">
        <Phone size={18} className="text-success-700" />
        Contact du trouveur
      </h2>
      <p className="mt-1 text-body-sm text-ink-700">
        Appelez-le pour convenir du lieu et de l’heure de la remise.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={`tel:${dialable}`}
          className={buttonClasses({ variant: 'primary' })}
        >
          <Phone size={16} /> Appeler {displayPhone}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className={buttonClasses({ variant: 'outline', size: 'sm' })}
        >
          <Copy size={14} /> {copied ? 'Copié' : 'Copier le numéro'}
        </button>
      </div>

      {contact.finderName ? (
        <p className="mt-3 text-body-sm text-ink-800">
          Déclaré par <strong className="font-bold">{contact.finderName}</strong>
          {contact.finderIsSamaritan ? (
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-2xs font-bold text-brand-700">
              Geste civique vérifié
            </span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-3 text-2xs text-ink-500">
        Ce numéro vous est communiqué avec l’accord du trouveur, pour cette restitution
        uniquement. Ne le diffusez pas et n’en faites pas un autre usage.
      </p>
    </section>
  );
}
