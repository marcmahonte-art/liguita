'use server';

import { createClient } from '../../lib/supabase/server';

export interface NotificationListItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listMyNotifications(): Promise<{
  items: NotificationListItem[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: 'Non connecté' };

  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, title, body, read_at, created_at')
    .eq('user_id', user.id)
    .eq('channel', 'WEB')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as NotificationListItem[] };
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'Notification invalide.' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
