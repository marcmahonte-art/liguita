/**
 * Conversion des lignes SQL (lost_items / found_items) vers les sides
 * du moteur `@liguita/core/matching`, et persistance des correspondances.
 *
 * Le score n'est jamais calculé en base : le pré-filtrage SQL réduit l'espace
 * de recherche, `scoreMatch` fait le reste (plan v3 §6.4).
 */

import { findCategory } from '@liguita/config';
import {
  normalizeColor,
  scoreMatch,
  shouldNotify,
  shouldPersist,
  type FoundSide,
  type LostSide,
  type MatchBreakdown,
  type MatchLevel,
} from '@liguita/core/matching';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client compatible : service_role (cron / matching) ou session serveur.
 * Les deux exposent `.rpc()` et `.from()` de la même manière.
 */
type SupabaseLike = Pick<SupabaseClient, 'rpc' | 'from'>;

interface LostRow {
  id: string;
  category_code: string;
  item_type_code: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  place_label: string;
  occurred_at: string;
}

interface FoundRow {
  id: string;
  category_code: string;
  item_type_code: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  city_slug: string;
  neighborhood_slug: string | null;
  place_label: string;
  found_at: string;
}

const LOST_COLUMNS =
  'id, category_code, item_type_code, title, description, brand, color, city_slug, neighborhood_slug, place_label, occurred_at';
const FOUND_COLUMNS =
  'id, category_code, item_type_code, title, description, brand, color, city_slug, neighborhood_slug, place_label, found_at';

function parentOf(categoryCode: string): string | null {
  return findCategory(categoryCode)?.parentId ?? null;
}

function toLostSide(row: LostRow): LostSide {
  return {
    itemTypeId: row.item_type_code,
    categoryId: row.category_code,
    parentCategoryId: parentOf(row.category_code),
    // Pas de place_id dans le schéma actuel : place_label est libre.
    placeId: null,
    neighborhoodId: row.neighborhood_slug,
    cityId: row.city_slug,
    countryCode: 'TD',
    colorCode: normalizeColor(row.color) as LostSide['colorCode'],
    brand: row.brand,
    description: row.description,
    lostAt: new Date(row.occurred_at),
  };
}

function toFoundSide(row: FoundRow): FoundSide {
  return {
    itemTypeId: row.item_type_code,
    categoryId: row.category_code,
    parentCategoryId: parentOf(row.category_code),
    placeId: null,
    neighborhoodId: row.neighborhood_slug,
    cityId: row.city_slug,
    countryCode: 'TD',
    colorCode: normalizeColor(row.color) as FoundSide['colorCode'],
    brand: row.brand,
    description: row.description,
    foundAt: new Date(row.found_at),
  };
}

function breakdownJson(breakdown: MatchBreakdown): Record<string, number> {
  return {
    type: breakdown.type,
    place: breakdown.place,
    date: breakdown.date,
    color: breakdown.color,
    brand: breakdown.brand,
    description: breakdown.description,
  };
}

/**
 * Calcule et persiste les correspondances pour une trouvaille donnée.
 * @returns nombre de paires persistées (score ≥ 55).
 */
export async function runMatchingForFound(
  supabase: SupabaseLike,
  foundId: string,
): Promise<number> {
  const { data: candidates, error: candErr } = await supabase.rpc(
    'match_candidates_for_found',
    { p_found_id: foundId },
  );
  if (candErr || !candidates?.length) return 0;

  const { data: foundRow, error: fErr } = await supabase
    .from('found_items')
    .select(FOUND_COLUMNS)
    .eq('id', foundId)
    .single();
  if (fErr || !foundRow) return 0;

  const lostIds = candidates.map((c: { lost_item_id: string }) => c.lost_item_id);
  const { data: lostRows, error: lErr } = await supabase
    .from('lost_items')
    .select(LOST_COLUMNS)
    .in('id', lostIds);
  if (lErr || !lostRows?.length) return 0;

  const foundSide = toFoundSide(foundRow as FoundRow);
  let persisted = 0;

  for (const lostRow of lostRows as LostRow[]) {
    const result = scoreMatch(toLostSide(lostRow), foundSide);
    if (!shouldPersist(result)) continue;

    const { error } = await supabase.rpc('upsert_match', {
      p_lost_item_id: lostRow.id,
      p_found_item_id: foundId,
      p_score: result.score,
      p_level: result.level as MatchLevel,
      p_breakdown: breakdownJson(result.breakdown),
    });
    if (!error) persisted += 1;
  }

  return persisted;
}

/**
 * Calcule et persiste les correspondances pour une perte donnée.
 * @returns nombre de paires persistées (score ≥ 55).
 */
export async function runMatchingForLost(
  supabase: SupabaseLike,
  lostId: string,
): Promise<number> {
  const { data: candidates, error: candErr } = await supabase.rpc(
    'match_candidates_for_lost',
    { p_lost_id: lostId },
  );
  if (candErr || !candidates?.length) return 0;

  const { data: lostRow, error: lErr } = await supabase
    .from('lost_items')
    .select(LOST_COLUMNS)
    .eq('id', lostId)
    .single();
  if (lErr || !lostRow) return 0;

  const foundIds = candidates.map((c: { found_item_id: string }) => c.found_item_id);
  const { data: foundRows, error: fErr } = await supabase
    .from('found_items')
    .select(FOUND_COLUMNS)
    .in('id', foundIds);
  if (fErr || !foundRows?.length) return 0;

  const lostSide = toLostSide(lostRow as LostRow);
  let persisted = 0;

  for (const foundRow of foundRows as FoundRow[]) {
    const result = scoreMatch(lostSide, toFoundSide(foundRow));
    if (!shouldPersist(result)) continue;

    const { error } = await supabase.rpc('upsert_match', {
      p_lost_item_id: lostId,
      p_found_item_id: foundRow.id,
      p_score: result.score,
      p_level: result.level as MatchLevel,
      p_breakdown: breakdownJson(result.breakdown),
    });
    if (!error) persisted += 1;
  }

  return persisted;
}

/**
 * Balayage complet (worker / cron) : réévalue les paires candidates
 * non déjà CLAIMED/REJECTED. Idempotent via upsert_match.
 */
export async function runMatchSweep(
  supabase: SupabaseLike,
  limit = 200,
): Promise<{ pairs: number; persisted: number }> {
  const { data: pairs, error } = await supabase.rpc('match_sweep_candidates', {
    p_window_days: 90,
    p_limit: limit,
  });
  if (error || !pairs?.length) return { pairs: 0, persisted: 0 };

  // Dédupliquer par found pour limiter les allers-retours
  const byFound = new Map<string, string[]>();
  for (const p of pairs as Array<{ lost_item_id: string; found_item_id: string }>) {
    const list = byFound.get(p.found_item_id) ?? [];
    list.push(p.lost_item_id);
    byFound.set(p.found_item_id, list);
  }

  let persisted = 0;
  for (const [foundId, lostIds] of byFound) {
    const { data: foundRow } = await supabase
      .from('found_items')
      .select(FOUND_COLUMNS)
      .eq('id', foundId)
      .single();
    if (!foundRow) continue;

    const { data: lostRows } = await supabase
      .from('lost_items')
      .select(LOST_COLUMNS)
      .in('id', lostIds);
    if (!lostRows?.length) continue;

    const foundSide = toFoundSide(foundRow as FoundRow);
    for (const lostRow of lostRows as LostRow[]) {
      const result = scoreMatch(toLostSide(lostRow), foundSide);
      if (!shouldPersist(result)) continue;
      const { error: upErr } = await supabase.rpc('upsert_match', {
        p_lost_item_id: lostRow.id,
        p_found_item_id: foundId,
        p_score: result.score,
        p_level: result.level as MatchLevel,
        p_breakdown: breakdownJson(result.breakdown),
      });
      if (!upErr) persisted += 1;
    }
  }

  return { pairs: pairs.length, persisted };
}

export { shouldNotify };
