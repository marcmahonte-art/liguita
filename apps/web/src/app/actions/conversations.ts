'use server';

import { revalidatePath } from 'next/cache';

import { publicNameOf } from '../../lib/auth/identity';
import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { isOffPlatformMessage } from '../../lib/moderation/message-safety';

export interface ConversationListItem {
  id: string;
  matchId: string;
  status: string;
  title: string;
  citySlug: string | null;
  counterpartName: string | null;
  updatedAt: string;
  returnScheduledAt: string | null;
}

export interface ConversationMessage {
  id: string;
  body: string;
  isSystem: boolean;
  flagged: boolean;
  isMine: boolean;
  senderName: string;
  createdAt: string;
}

export interface ConversationView {
  id: string;
  matchId: string;
  status: string;
  isOwner: boolean;
  title: string;
  citySlug: string | null;
  returnPlace: string | null;
  returnScheduledAt: string | null;
  ownerConfirmedAt: string | null;
  finderConfirmedAt: string | null;
  messages: ConversationMessage[];
}

function detectOffPlatform(body: string): boolean {
  return isOffPlatformMessage(body);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function getMatchDetails(
  matchIds: string[],
  reader: NonNullable<ReturnType<typeof tryCreateServiceClient>>,
) {
  if (matchIds.length === 0) return new Map<string, { title: string; citySlug: string | null }>();
  const { data: matches } = await reader
    .from('matches')
    .select('id, lost_item_id, found_item_id')
    .in('id', matchIds);
  const ids = matches ?? [];
  const lostIds = ids.map((row) => row.lost_item_id);
  const foundIds = ids.map((row) => row.found_item_id);
  const [lost, found] = await Promise.all([
    reader.from('lost_items').select('id, title, city_slug').in('id', lostIds),
    reader.from('found_items').select('id, title, city_slug').in('id', foundIds),
  ]);
  const lostById = new Map((lost.data ?? []).map((row) => [row.id, row]));
  const foundById = new Map((found.data ?? []).map((row) => [row.id, row]));
  return new Map(
    ids.map((row) => {
      const detail = lostById.get(row.lost_item_id) ?? foundById.get(row.found_item_id);
      return [row.id, { title: detail?.title ?? 'Objet', citySlug: detail?.city_slug ?? null }];
    }),
  );
}

export async function listMyConversations(): Promise<{
  items: ConversationListItem[];
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { items: [], error: 'Non connecté' };

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, match_id, owner_id, finder_id, status, updated_at, return_scheduled_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) return { items: [], error: error.message };

  const service = tryCreateServiceClient();
  if (!service || !conversations?.length) return { items: [] };
  const details = await getMatchDetails(
    conversations.map((row) => row.match_id),
    service,
  );
  const { data: profiles } = await service
    .from('profiles')
    .select('id, first_name, last_name, full_name, display_name')
    .in('id', Array.from(new Set(conversations.flatMap((row) => [row.owner_id, row.finder_id]))));

  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));
  return {
    items: conversations.map((row) => {
      const otherId = row.owner_id === user.id ? row.finder_id : row.owner_id;
      const profile = profileById.get(otherId);
      const detail = details.get(row.match_id);
      return {
        id: row.id,
        matchId: row.match_id,
        status: row.status,
        title: detail?.title ?? 'Objet',
        citySlug: detail?.citySlug ?? null,
        counterpartName: publicNameOf(profile),
        updatedAt: row.updated_at,
        returnScheduledAt: row.return_scheduled_at,
      };
    }),
  };
}

export async function openConversation(
  matchId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: 'Non connecté' };
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle();
  if (!conversation)
    return { error: 'Le paiement doit être confirmé avant l’ouverture de la conversation.' };
  return { conversationId: conversation.id };
}

export async function getConversation(
  id: string,
): Promise<{ conversation: ConversationView | null; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { conversation: null, error: 'Non connecté' };

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(
      'id, match_id, owner_id, finder_id, status, return_place, return_scheduled_at, owner_confirmed_at, finder_confirmed_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) return { conversation: null, error: error.message };
  if (!conversation) return { conversation: null, error: 'Conversation introuvable.' };

  const service = tryCreateServiceClient();
  if (!service) return { conversation: null, error: 'Service indisponible.' };
  const { data: messages } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, is_system, flagged, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (!messages) return { conversation: null, error: 'Messages indisponibles.' };

  const profileIds = Array.from(new Set(messages.map((message) => message.sender_id)));
  const { data: profiles } = await service
    .from('profiles')
    .select('id, first_name, last_name, full_name, display_name')
    .in('id', profileIds);
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const detail = (await getMatchDetails([conversation.match_id], service)).get(
    conversation.match_id,
  );
  const isOwner = conversation.owner_id === user.id;

  return {
    conversation: {
      id: conversation.id,
      matchId: conversation.match_id,
      status: conversation.status,
      isOwner,
      title: detail?.title ?? 'Objet',
      citySlug: detail?.citySlug ?? null,
      returnPlace: conversation.return_place,
      returnScheduledAt: conversation.return_scheduled_at,
      ownerConfirmedAt: conversation.owner_confirmed_at,
      finderConfirmedAt: conversation.finder_confirmed_at,
      messages: messages.map((message) => {
        const profile = profileById.get(message.sender_id);
        return {
          id: message.id,
          body: message.body,
          isSystem: message.is_system,
          flagged: message.flagged,
          isMine: message.sender_id === user.id,
          senderName: message.is_system
            ? 'Liguita'
            : (publicNameOf(profile) ?? 'Membre'),
          createdAt: message.created_at,
        };
      }),
    },
  };
}

export async function sendMessage(
  conversationId: string,
  rawBody: string,
): Promise<{ ok: boolean; message?: ConversationMessage; error?: string }> {
  const body = rawBody.trim();
  if (!body || body.length > 2000)
    return { ok: false, error: 'Le message doit contenir entre 1 et 2 000 caractères.' };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  const { data: conversation } = await supabase
    .from('conversations')
    .select('owner_id, finder_id, status')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conversation || (conversation.owner_id !== user.id && conversation.finder_id !== user.id)) {
    return { ok: false, error: 'Accès refusé.' };
  }
  if (conversation.status === 'CLOSED' || conversation.status === 'DISPUTED') {
    return { ok: false, error: 'Cette conversation est close.' };
  }

  const service = tryCreateServiceClient();
  if (!service) return { ok: false, error: 'Service indisponible.' };
  const flagged = detectOffPlatform(body);
  const { data, error } = await service
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body, flagged })
    .select('id, body, is_system, flagged, created_at')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Envoi impossible.' };

  if (flagged) {
    const { data: moderators } = await service
      .from('profiles')
      .select('id')
      .in('app_role', ['MODERATOR', 'ADMIN']);
    if (moderators?.length) {
      await service.from('notifications').insert(
        moderators.map((moderator) => ({
          user_id: moderator.id,
          kind: 'MESSAGE_FLAGGED',
          channel: 'WEB',
          title: 'Message à examiner',
          body: 'Un message contient un signal de sortie de plateforme.',
          payload: { conversation_id: conversationId, message_id: data.id },
        })),
      );
    }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('first_name, last_name, full_name, display_name')
    .eq('id', user.id)
    .maybeSingle();
  return {
    ok: true,
    message: {
      id: data.id,
      body: data.body,
      isSystem: data.is_system,
      flagged: data.flagged,
      isMine: true,
      senderName: publicNameOf(profile) ?? 'Vous',
      createdAt: data.created_at,
    },
  };
}

export async function confirmReturn(
  conversationId: string,
  side: 'OWNER' | 'FINDER',
): Promise<{ ok: boolean; status?: string; completed?: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  const { data, error } = await supabase.rpc('confirm_return', {
    p_conversation_id: conversationId,
    p_side: side,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/messages/${conversationId}`);
  return { ok: true, status: data.status, completed: data.completed };
}

export async function updateReturnPlan(
  conversationId: string,
  place: string,
  scheduledAt: string,
): Promise<{ ok: boolean; error?: string }> {
  const cleanPlace = place.trim();
  const date = scheduledAt ? new Date(scheduledAt) : null;
  if (!cleanPlace || cleanPlace.length > 160 || (date && Number.isNaN(date.getTime()))) {
    return { ok: false, error: 'Indiquez un lieu et une date valides.' };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  const { error } = await supabase
    .from('conversations')
    .update({ return_place: cleanPlace, return_scheduled_at: date?.toISOString() ?? null })
    .eq('id', conversationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/messages/${conversationId}`);
  return { ok: true };
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  return { ok: !error, error: error?.message };
}
