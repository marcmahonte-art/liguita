-- =============================================================================
-- Liguita — 0010 · Matching : SECURITY DEFINER sur le pré-filtrage cross-user
-- =============================================================================
-- `match_candidates_for_found` / `match_candidates_for_lost` tournaient en
-- SECURITY INVOKER : un trouveur ne voyait pas les pertes d'autrui (RLS), et
-- un propriétaire ne voyait que ses propres pertes dans le sens inverse.
-- Le matching doit comparer des paires entre utilisateurs différents.
--
-- On bascule en SECURITY DEFINER (comme `upsert_match` et le sweep) tout en
-- ne retournant que des UUID de candidats — les détails restent protégés par
-- RLS côté application (service_role uniquement pour le scoring).
-- =============================================================================

create or replace function public.match_candidates_for_found(
  p_found_id uuid,
  p_window_days int default 90
)
returns table (lost_item_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select l.id
  from lost_items l
  join found_items f on f.id = p_found_id
  where l.status in ('DECLARED', 'SEARCHING')
    and l.city_slug = f.city_slug
    and (
      l.category_code = f.category_code
      or l.item_type_code = f.item_type_code
      or exists (
        select 1
        from item_categories c1
        join item_categories c2 on c2.parent_id = c1.parent_id and c1.parent_id is not null
        where c1.code = l.category_code
          and c2.code = f.category_code
          and c1.id <> c2.id
      )
    )
    and l.occurred_at between (f.found_at - make_interval(days => p_window_days))
                          and (f.found_at + interval '1 day')
    and not exists (
      select 1 from matches m
      where m.lost_item_id = l.id and m.found_item_id = f.id
    );
$$;

create or replace function public.match_candidates_for_lost(
  p_lost_id uuid,
  p_window_days int default 90
)
returns table (found_item_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select f.id
  from found_items f
  join lost_items l on l.id = p_lost_id
  where f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED')
    and f.city_slug = l.city_slug
    and (
      f.category_code = l.category_code
      or f.item_type_code = l.item_type_code
      or exists (
        select 1
        from item_categories c1
        join item_categories c2 on c2.parent_id = c1.parent_id and c1.parent_id is not null
        where c1.code = l.category_code
          and c2.code = f.category_code
          and c1.id <> c2.id
      )
    )
    and f.found_at between (l.occurred_at - interval '1 day')
                       and (l.occurred_at + make_interval(days => p_window_days))
    and not exists (
      select 1 from matches m
      where m.lost_item_id = l.id and m.found_item_id = f.id
    );
$$;

comment on function public.match_candidates_for_found(uuid, int) is
  'Pré-filtrage SECURITY DEFINER : pertes candidates pour une trouvaille (cross-user). Score hors base.';
comment on function public.match_candidates_for_lost(uuid, int) is
  'Pré-filtrage SECURITY DEFINER symétrique : trouvailles candidates pour une perte.';

revoke execute on function public.match_candidates_for_found(uuid, int) from public;
revoke execute on function public.match_candidates_for_lost(uuid, int) from public;
grant execute on function public.match_candidates_for_found(uuid, int) to authenticated, service_role;
grant execute on function public.match_candidates_for_lost(uuid, int) to authenticated, service_role;
