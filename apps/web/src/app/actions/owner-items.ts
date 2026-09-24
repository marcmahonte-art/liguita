'use server';

import { createClient } from '../../lib/supabase/server';

export type OwnerItemKind = 'LOST' | 'FOUND';

export interface OwnerItemListItem {
  id: string;
  kind: OwnerItemKind;
  title: string;
  category_code: string;
  item_type_code: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  place_label: string;
  event_at: string;
  status: string;
  created_at: string;
  declared_value_xaf: number | null;
}

export interface OwnerItemDetail extends OwnerItemListItem {
  updated_at: string;
}

export interface OwnerItemDetailInput {
  kind: string;
  id: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOST_FIELDS =
  'id, title, category_code, item_type_code, description, brand, color, city_slug, neighborhood_slug, place_label, occurred_at, status, declared_value_xaf, created_at, updated_at';
const FOUND_FIELDS =
  'id, title, category_code, item_type_code, description, brand, color, city_slug, neighborhood_slug, place_label, found_at, status, created_at, updated_at';

function validateKind(kind: string): kind is OwnerItemKind {
  return kind === 'LOST' || kind === 'FOUND';
}

function validateId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export async function listMyOwnerItems(): Promise<{ items: OwnerItemListItem[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { items: [], error: 'Non connecté' };

  const [lostResult, foundResult] = await Promise.all([
    supabase
      .from('lost_items')
      .select(LOST_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('found_items')
      .select(FOUND_FIELDS)
      .eq('finder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (lostResult.error) return { items: [], error: lostResult.error.message };
  if (foundResult.error) return { items: [], error: foundResult.error.message };

  const lostItems = (lostResult.data ?? []).map((item) => ({
    ...item,
    kind: 'LOST' as const,
    event_at: item.occurred_at,
    declared_value_xaf: item.declared_value_xaf,
  }));
  const foundItems = (foundResult.data ?? []).map((item) => ({
    ...item,
    kind: 'FOUND' as const,
    event_at: item.found_at,
    declared_value_xaf: null,
  }));

  return {
    items: [...lostItems, ...foundItems].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    ),
  };
}

export async function getMyOwnerItem(
  input: OwnerItemDetailInput,
): Promise<{ item: OwnerItemDetail | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { item: null, error: 'Non connecté' };
  if (!validateKind(input.kind)) return { item: null, error: 'Type d’objet invalide.' };
  if (!validateId(input.id.trim())) return { item: null, error: 'Objet introuvable.' };

  const id = input.id.trim();
  if (input.kind === 'LOST') {
    const { data, error } = await supabase
      .from('lost_items')
      .select(LOST_FIELDS)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return { item: null, error: error.message };
    if (!data) return { item: null, error: 'Objet introuvable.' };
    return {
      item: {
        ...data,
        kind: 'LOST',
        event_at: data.occurred_at,
      },
    };
  }

  const { data, error } = await supabase
    .from('found_items')
    .select(FOUND_FIELDS)
    .eq('id', id)
    .eq('finder_id', user.id)
    .maybeSingle();
  if (error) return { item: null, error: error.message };
  if (!data) return { item: null, error: 'Objet introuvable.' };
  return {
    item: {
      ...data,
      kind: 'FOUND',
      event_at: data.found_at,
      declared_value_xaf: null,
    },
  };
}
