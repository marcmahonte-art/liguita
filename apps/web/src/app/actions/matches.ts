'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../../lib/supabase/server';
import { tryCreateServiceClient } from '../../lib/supabase/service';
import { runMatchingForFound, runMatchingForLost } from '../../lib/matching/run';

/**
 * Server Action : déclenche le matching synchrone après une déclaration.
 * Latence cible < 800 ms (plan §6.5). Service_role : lecture croisée des paires.
 */
export async function triggerMatchAfterFound(foundId: string): Promise<{ persisted: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { persisted: 0 };

  try {
    const service = tryCreateServiceClient();
    if (!service) return { persisted: 0 };
    const persisted = await runMatchingForFound(service, foundId);
    if (persisted > 0) revalidatePath('/app/correspondances');
    return { persisted };
  } catch {
    return { persisted: 0 };
  }
}

export async function triggerMatchAfterLost(lostId: string): Promise<{ persisted: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { persisted: 0 };

  try {
    const service = tryCreateServiceClient();
    if (!service) return { persisted: 0 };
    const persisted = await runMatchingForLost(service, lostId);
    if (persisted > 0) revalidatePath('/app/correspondances');
    return { persisted };
  } catch {
    return { persisted: 0 };
  }
}

export interface MatchListItem {
  id: string;
  score: number;
  level: string;
  status: string;
  created_at: string;
  /** Titre du côté que l'utilisateur possède (perdu OU trouvé). */
  title: string;
  city_slug: string | null;
  /** Rôle de l'utilisateur dans cette paire. */
  side: 'lost' | 'found';
  counterpart_title: string | null;
}

/**
 * Liste des correspondances de l'utilisateur.
 *
 * Accès contrôlé par la RLS sur `matches` (parties uniquement). Les titres des
 * deux côtés sont ensuite chargés via service_role : un trouveur ne voit pas
 * `lost_items` en RLS, mais doit afficher le titre de la perte appariée.
 */
export async function listMyMatches(): Promise<{ items: MatchListItem[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: 'Non connecté' };

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, lost_item_id, found_item_id, score, level, status, created_at')
    .order('score', { ascending: false })
    .limit(50);

  if (error) return { items: [], error: error.message };
  if (!matches?.length) return { items: [] };

  const lostIds = matches.map((m) => m.lost_item_id).filter(Boolean);
  const foundIds = matches.map((m) => m.found_item_id).filter(Boolean);
  const reader = tryCreateServiceClient() ?? supabase;

  const [lostRes, foundRes] = await Promise.all([
    lostIds.length
      ? reader.from('lost_items').select('id, title, city_slug').in('id', lostIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; city_slug: string }> }),
    foundIds.length
      ? reader.from('found_items').select('id, title, city_slug').in('id', foundIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; city_slug: string }> }),
  ]);

  const lostById = new Map(
    (lostRes.data ?? []).map((r) => [r.id, r as { id: string; title: string; city_slug: string }]),
  );
  const foundById = new Map(
    (foundRes.data ?? []).map((r) => [r.id, r as { id: string; title: string; city_slug: string }]),
  );

  const items: MatchListItem[] = [];
  for (const m of matches) {
    const lost = lostById.get(m.lost_item_id);
    const found = foundById.get(m.found_item_id);

    // On n'affiche que les paires où l'utilisateur tient au moins un côté.
    if (lost) {
      items.push({
        id: m.id,
        score: Number(m.score),
        level: m.level,
        status: m.status,
        created_at: m.created_at,
        title: lost.title,
        city_slug: lost.city_slug,
        side: 'lost',
        counterpart_title: found?.title ?? null,
      });
    } else if (found) {
      items.push({
        id: m.id,
        score: Number(m.score),
        level: m.level,
        status: m.status,
        created_at: m.created_at,
        title: found.title,
        city_slug: found.city_slug,
        side: 'found',
        counterpart_title: null,
      });
    }
  }

  return { items };
}

export interface MatchDetail {
  id: string;
  score: number;
  level: string;
  status: string;
  created_at: string;
  breakdown: Record<string, number>;
  lost: {
    id: string;
    title: string;
    description: string | null;
    brand: string | null;
    color: string | null;
    city_slug: string;
    neighborhood_slug: string | null;
    place_label: string;
    occurred_at: string;
    category_code: string;
  } | null;
  found: {
    id: string;
    title: string;
    description: string | null;
    brand: string | null;
    color: string | null;
    city_slug: string;
    neighborhood_slug: string | null;
    place_label: string;
    found_at: string;
    category_code: string;
  } | null;
}

export async function getMatchDetail(
  id: string,
): Promise<{ item: MatchDetail | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { item: null, error: 'Non connecté' };

  const { data: match, error } = await supabase
    .from('matches')
    .select('id, lost_item_id, found_item_id, score, level, status, created_at, breakdown')
    .eq('id', id)
    .maybeSingle();

  if (error) return { item: null, error: error.message };
  if (!match) return { item: null };

  // Après contrôle RLS sur `matches`, charge les deux côtés en service_role
  // (le trouveur ne peut pas lire `lost_items` d'un tiers en RLS).
  const reader = tryCreateServiceClient() ?? supabase;
  const [lostRes, foundRes] = await Promise.all([
    reader
      .from('lost_items')
      .select(
        'id, title, description, brand, color, city_slug, neighborhood_slug, place_label, occurred_at, category_code',
      )
      .eq('id', match.lost_item_id)
      .maybeSingle(),
    reader
      .from('found_items')
      .select(
        'id, title, description, brand, color, city_slug, neighborhood_slug, place_label, found_at, category_code',
      )
      .eq('id', match.found_item_id)
      .maybeSingle(),
  ]);

  return {
    item: {
      id: match.id,
      score: Number(match.score),
      level: match.level,
      status: match.status,
      created_at: match.created_at,
      breakdown: (match.breakdown ?? {}) as Record<string, number>,
      lost: lostRes.data as MatchDetail['lost'],
      found: foundRes.data as MatchDetail['found'],
    },
  };
}

/** Change le statut d'un match (ex. REJECTED). Le worker ne l'écrase jamais. */
export async function setMatchStatus(
  matchId: string,
  status: 'NEW' | 'SEEN' | 'CLAIMED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase.from('matches').update({ status }).eq('id', matchId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/correspondances');
  revalidatePath(`/app/correspondances/${matchId}`);
  return { ok: true };
}
