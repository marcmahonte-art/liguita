'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../../lib/supabase/server';

export interface SavedSearchInput {
  label?: string;
  query?: string;
  categoryCode?: string;
  citySlug?: string;
  neighborhoodSlug?: string;
  itemTypeCode?: string;
}

export interface SavedSearch {
  id: string;
  label: string | null;
  query: string | null;
  category_code: string | null;
  city_slug: string | null;
  neighborhood_slug: string | null;
  item_type_code: string | null;
  is_active: boolean;
  last_run_at: string | null;
  last_notified_at: string | null;
  created_at: string;
}

export async function saveSearch(input: SavedSearchInput): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Connectez-vous pour enregistrer une recherche.' };

  const label =
    input.label?.trim() ||
    [input.query, input.categoryCode, input.citySlug].filter(Boolean).join(' · ') ||
    'Ma recherche';

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      label: label.slice(0, 120),
      query: input.query?.trim() || null,
      category_code: input.categoryCode || null,
      city_slug: input.citySlug || null,
      neighborhood_slug: input.neighborhoodSlug || null,
      item_type_code: input.itemTypeCode || null,
      channels: ['WEB'],
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "L'enregistrement a échoué." };
  }

  revalidatePath('/app/avis');
  return { ok: true, id: data.id };
}

export async function listMySearches(): Promise<{ items: SavedSearch[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: 'Non connecté' };

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as SavedSearch[] };
}

export async function toggleSavedSearch(id: string, isActive: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase
    .from('saved_searches')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/avis');
  return { ok: true };
}

export async function deleteSavedSearch(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase.from('saved_searches').delete().eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/avis');
  return { ok: true };
}
