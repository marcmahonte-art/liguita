'use server';

import { revalidatePath } from 'next/cache';

import { findCategory } from '@liguita/config';

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
export type MatchPhoto = {
  side: 'lost' | 'found';
  signedUrl: string;
};

export interface MatchPhotosResult {
  success: boolean;
  photos?: MatchPhoto[];
  canSeeCounterpart?: boolean;
  viewerSide?: 'lost' | 'found' | 'staff';
  error?: string;
}

const MATCH_PHOTO_PATH_PATTERN = /^(LOST|FOUND)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i;

function isAllowedMatchPhotoPath(path: string, kind: string, itemId: string): boolean {
  return path.startsWith(`${kind}/${itemId}/`) && MATCH_PHOTO_PATH_PATTERN.test(path);
}

export async function getMatchPhotos(matchId: string): Promise<MatchPhotosResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Non connecté' };

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, lost_item_id, found_item_id, status')
    .eq('id', matchId)
    .maybeSingle();
  if (matchError) return { success: false, error: matchError.message };
  if (!match) return { success: false, error: 'Correspondance introuvable.' };

  const service = tryCreateServiceClient();
  if (!service) return { success: false, error: 'Service indisponible.' };

  const [lostResult, foundResult] = await Promise.all([
    service.from('lost_items').select('id, user_id, category_code').eq('id', match.lost_item_id).maybeSingle(),
    service
      .from('found_items')
      .select('id, finder_id, category_code')
      .eq('id', match.found_item_id)
      .maybeSingle(),
  ]);
  if (lostResult.error || foundResult.error) {
    return { success: false, error: 'Impossible de vérifier les objets de la correspondance.' };
  }

  const lost = lostResult.data as { id: string; user_id: string; category_code: string } | null;
  const found = foundResult.data as {
    id: string;
    finder_id: string | null;
    category_code: string;
  } | null;
  if (!lost || !found) return { success: false, error: 'Correspondance incomplète.' };

  const { data: profile } = await service
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .in('app_role', ['ADMIN', 'MODERATOR'])
    .maybeSingle();
  const isStaff = Boolean(profile);
  const role = isStaff ? 'staff' : lost.user_id === user.id ? 'lost' : found.finder_id === user.id ? 'found' : null;
  if (!role) return { success: false, error: 'Accès refusé.' };

  const { data: claim } = await service
    .from('claims')
    .select('status')
    .eq('match_id', matchId)
    .eq('claimant_id', lost.user_id)
    .maybeSingle();
  const counterpartCategory =
    role === 'lost' ? found.category_code : role === 'found' ? lost.category_code : null;
  const counterpartIsSensitive = Boolean(counterpartCategory && findCategory(counterpartCategory)?.isSensitive);
  const canSeeCounterpart =
    isStaff ||
    (!counterpartIsSensitive &&
      claim?.status === 'APPROVED' &&
      (match.status === 'CLAIMED' || match.status === 'CONVERTED'));

  const sides: Array<'lost' | 'found'> = [];
  if (role === 'staff' || role === 'lost') sides.push('lost');
  if (role === 'staff' || role === 'found') sides.push('found');
  if (canSeeCounterpart && role === 'lost') sides.push('found');
  if (canSeeCounterpart && role === 'found') sides.push('lost');
  const uniqueSides = [...new Set(sides)];

  const photos: MatchPhoto[] = [];
  for (const side of uniqueSides) {
    const itemKind = side === 'lost' ? 'LOST' : 'FOUND';
    const itemId = side === 'lost' ? lost.id : found.id;
    const { data: itemPhotos, error: photosError } = await service
      .from('item_photos')
      .select('url')
      .eq('item_kind', itemKind)
      .eq('item_id', itemId)
      .order('sort_order', { ascending: true });
    if (photosError) return { success: false, error: photosError.message };

    for (const photo of itemPhotos ?? []) {
      if (!isAllowedMatchPhotoPath(photo.url, itemKind, itemId)) continue;
      const signed = await service.storage.from('item-photos').createSignedUrl(photo.url, 60);
      if (signed.error || !signed.data?.signedUrl) {
        return { success: false, error: signed.error?.message ?? 'Photo indisponible.' };
      }
      photos.push({ side, signedUrl: signed.data.signedUrl });
    }
  }

  return { success: true, photos, canSeeCounterpart, viewerSide: role };
}

export async function setMatchStatus(
  matchId: string,
  status: 'SEEN' | 'REJECTED',
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
