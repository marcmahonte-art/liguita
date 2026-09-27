-- ============================================================
-- 20260923003400_unified_public_search.sql
-- Recherche publique unifiée (perdus + trouvés) et exclusion des
-- objets trouvés déjà vérifiés et réclamés
-- ============================================================
-- DEUX PROBLÈMES DISTINCTS, corrigés ici.
--
-- 1. L'OBJET TROUVÉ RÉCLAMÉ RESTAIT VISIBLE
--    `search_public_found_items` ne filtrait que sur `found_items.status`. Or le
--    flux de réclamation ne fait jamais avancer ce statut : à la validation de la
--    vérification, la ligne passe à `matches.status = 'CLAIMED'` et
--    `claims.status = 'APPROVED'`, mais `found_items.status` reste 'FOUND'. Un objet
--    dont le propriétaire a été identifié et payé continuait donc d'être annoncé
--    publiquement, et d'appeler d'autres déclarations. Le filtre par statut ne peut
--    pas voir ce qui s'est passé dans `matches` / `claims` : c'est un fait
--    relationnel, pas un état de l'objet.
--
--    Le même `NOT EXISTS` est appliqué ici et dans `search_public_items` ci-dessous,
--    pour que `/rechercher` et `/objets-trouves` ne puissent pas diverger.
--
-- 2. LES DEUX LISTES N'ÉTAIENT PAS TRIÉES ENSEMBLE
--    La page fusionnait deux réponses paginées indépendamment, ce qui affichait les
--    12 objets trouvés puis les 12 objets perdus, sans ordre global. `search_public_items`
--    les fusionne EN BASE, avec un curseur unique et un tri par date décroissante —
--    la seule façon d'avoir un ordre correct dès la page suivante.
--
-- ⚠️ Le tri global est pondéré par la pertinence quand une recherche est saisie
-- (rang FTS puis trigramme, comme les deux fonctions existantes), et par la date
-- décroissante sinon. Trier « du plus récent au plus ancien » ne peut pas écraser la
-- pertinence : chercher « passeport » doit remonter le passeport qui correspond,
-- pas le plus récent.
--
-- `event_at` = `found_at` pour un objet trouvé, `occurred_at` pour un objet perdu :
-- la date de l'événement dans chaque cas, ce qui rend les deux populations
-- comparables. Le curseur est le triplet (event_at, kind, id) — sans `kind`, deux
-- objets de même date se chevaucheraient entre deux pages.
-- ============================================================

/* -------------------------------------------------------------------------- */
/* Exclusion : un objet trouvé déjà réclamé sort de la recherche publique        */
/* -------------------------------------------------------------------------- */

create or replace function public.search_public_found_items(
  p_query text default null,
  p_category_code text default null,
  p_neighborhood_slug text default null,
  p_cursor_found_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  id uuid,
  category_code text,
  item_type_code text,
  title text,
  brand text,
  color text,
  city_slug text,
  neighborhood_slug text,
  place_label text,
  found_at timestamptz,
  status item_status,
  created_at timestamptz,
  photo_path text,
  next_cursor_found_at timestamptz,
  next_cursor_id uuid
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with normalized as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as q,
      nullif(btrim(coalesce(p_category_code, '')), '') as cat,
      nullif(btrim(coalesce(p_neighborhood_slug, '')), '') as hood,
      least(greatest(coalesce(p_limit, 20), 1), 50) as lim
  ),
  ranked as (
    select
      f.id,
      f.category_code,
      f.item_type_code,
      f.title,
      f.brand,
      f.color,
      f.city_slug,
      f.neighborhood_slug,
      f.place_label,
      f.found_at,
      f.status,
      f.created_at,
      (
        select p.url
        from public.item_photos p
        where p.item_kind = 'FOUND'
          and p.item_id = f.id
        order by p.sort_order asc, p.created_at asc
        limit 1
      ) as photo_path,
      case
        when n.q is null then null
        else similarity(immutable_unaccent(f.title), n.q)
           + similarity(immutable_unaccent(coalesce(f.description, '')), n.q)
      end as trgm_score,
      case
        when n.q is null then null
        else ts_rank(f.search_vector, websearch_to_tsquery('french', n.q))
      end as fts_rank
    from public.found_items f
    cross join normalized n
    where f.is_public = true
      and f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED')
      and (n.cat is null or f.category_code = n.cat)
      and (n.hood is null or f.neighborhood_slug = n.hood)
      -- Propriétaire déjà identifié et vérifié : l'objet n'est plus à annoncer.
      and not exists (
        select 1
        from public.matches m
        join public.claims c on c.match_id = m.id
        where m.found_item_id = f.id
          and c.status = 'APPROVED'
      )
      and (
        n.q is null
        or f.search_vector @@ websearch_to_tsquery('french', n.q)
        or immutable_unaccent(f.title) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.description, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.brand, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.color, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(f.title) ilike '%' || immutable_unaccent(n.q) || '%'
        or immutable_unaccent(coalesce(f.description, '')) ilike '%' || immutable_unaccent(n.q) || '%'
      )
      and (
        p_cursor_found_at is null
        or p_cursor_id is null
        or (f.found_at, f.id) < (p_cursor_found_at, p_cursor_id)
      )
  ),
  page as (
    select
      ranked.*,
      row_number() over (
        order by
          case
            when p_cursor_found_at is null and ranked.fts_rank is not null then ranked.fts_rank
            else 0
          end desc,
          case
            when p_cursor_found_at is null and ranked.trgm_score is not null then ranked.trgm_score
            else 0
          end desc,
          ranked.found_at desc,
          ranked.id desc
      ) as rn
    from ranked
  ),
  limited as (
    select *
    from page
    where rn <= (select lim from normalized)
  )
  select
    limited.id,
    limited.category_code,
    limited.item_type_code,
    limited.title,
    limited.brand,
    limited.color,
    limited.city_slug,
    limited.neighborhood_slug,
    limited.place_label,
    limited.found_at,
    limited.status,
    limited.created_at,
    limited.photo_path,
    case when limited.rn < (select lim from normalized) + 1 then limited.found_at else null end as next_cursor_found_at,
    case when limited.rn < (select lim from normalized) + 1 then limited.id else null end as next_cursor_id
  from limited
  order by limited.rn;
$$;

revoke execute on function public.search_public_found_items(text, text, text, timestamptz, uuid, int) from public, anon, authenticated;
grant execute on function public.search_public_found_items(text, text, text, timestamptz, uuid, int) to service_role;

/* -------------------------------------------------------------------------- */
/* Recherche publique unifiée                                                  */
/* -------------------------------------------------------------------------- */

create or replace function public.search_public_items(
  p_query text default null,
  p_kind text default null,
  p_category_code text default null,
  p_neighborhood_slug text default null,
  p_cursor_event_at timestamptz default null,
  p_cursor_kind text default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  kind text,
  id uuid,
  category_code text,
  item_type_code text,
  title text,
  brand text,
  color text,
  city_slug text,
  neighborhood_slug text,
  place_label text,
  event_at timestamptz,
  status text,
  created_at timestamptz,
  photo_path text,
  next_cursor_event_at timestamptz,
  next_cursor_kind text,
  next_cursor_id uuid
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with normalized as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as q,
      nullif(btrim(coalesce(p_kind, '')), '') as kind,
      nullif(btrim(coalesce(p_category_code, '')), '') as cat,
      nullif(btrim(coalesce(p_neighborhood_slug, '')), '') as hood,
      least(greatest(coalesce(p_limit, 20), 1), 50) as lim
  ),
  pool as (
    -- Objets trouvés : la même visibilité que `search_public_found_items`.
    select
      'FOUND'::text as kind,
      f.id,
      f.category_code,
      f.item_type_code,
      f.title,
      f.brand,
      f.color,
      f.city_slug,
      f.neighborhood_slug,
      f.place_label,
      f.found_at as event_at,
      f.status::text as status,
      f.created_at,
      f.description,
      f.search_vector,
      (
        select p.url
        from public.item_photos p
        where p.item_kind = 'FOUND'
          and p.item_id = f.id
        order by p.sort_order asc, p.created_at asc
        limit 1
      ) as photo_path
    from public.found_items f
    cross join normalized n
    where f.is_public = true
      and f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED')
      and (n.kind is null or n.kind = 'FOUND')
      and (n.cat is null or f.category_code = n.cat)
      and (n.hood is null or f.neighborhood_slug = n.hood)
      and not exists (
        select 1
        from public.matches m
        join public.claims c on c.match_id = m.id
        where m.found_item_id = f.id
          and c.status = 'APPROVED'
      )
      and (
        n.q is null
        or f.search_vector @@ websearch_to_tsquery('french', n.q)
        or immutable_unaccent(f.title) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.description, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.brand, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.color, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(f.title) ilike '%' || immutable_unaccent(n.q) || '%'
        or immutable_unaccent(coalesce(f.description, '')) ilike '%' || immutable_unaccent(n.q) || '%'
      )
    union all
    -- Objets perdus : un objet déjà apparié ou vérifié n'est plus `DECLARED`
    -- ni `SEARCHING`, il est donc déjà exclu par le statut.
    select
      'LOST'::text as kind,
      l.id,
      l.category_code,
      l.item_type_code,
      l.title,
      l.brand,
      l.color,
      l.city_slug,
      l.neighborhood_slug,
      l.place_label,
      l.occurred_at as event_at,
      l.status::text as status,
      l.created_at,
      l.description,
      l.search_vector,
      (
        select p.url
        from public.item_photos p
        where p.item_kind = 'LOST'
          and p.item_id = l.id
        order by p.sort_order asc, p.created_at asc
        limit 1
      ) as photo_path
    from public.lost_items l
    cross join normalized n
    where l.is_public = true
      and l.status in ('DECLARED', 'SEARCHING')
      and (n.kind is null or n.kind = 'LOST')
      and (n.cat is null or l.category_code = n.cat)
      and (n.hood is null or l.neighborhood_slug = n.hood)
      and (
        n.q is null
        or l.search_vector @@ websearch_to_tsquery('french', n.q)
        or immutable_unaccent(l.title) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(l.description, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(l.brand, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(l.color, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(l.title) ilike '%' || immutable_unaccent(n.q) || '%'
        or immutable_unaccent(coalesce(l.description, '')) ilike '%' || immutable_unaccent(n.q) || '%'
      )
  ),
  ranked as (
    select
      pool.*,
      case
        when n.q is null then null
        else similarity(immutable_unaccent(pool.title), n.q)
           + similarity(immutable_unaccent(coalesce(pool.description, '')), n.q)
      end as trgm_score,
      case
        when n.q is null then null
        else ts_rank(pool.search_vector, websearch_to_tsquery('french', n.q))
      end as fts_rank
    from pool
    cross join normalized n
    where p_cursor_event_at is null
       or p_cursor_id is null
       or p_cursor_kind is null
       or (pool.event_at, pool.kind, pool.id) < (p_cursor_event_at, p_cursor_kind, p_cursor_id)
  ),
  page as (
    select
      ranked.*,
      row_number() over (
        order by
          -- Pertinence seulement sur la première page : une fois le curseur posé,
          -- la suite doit être purement chronologique, sinon « Afficher plus »
          -- remonterait des résultats déjà vus.
          case
            when p_cursor_event_at is null and ranked.fts_rank is not null then ranked.fts_rank
            else 0
          end desc,
          case
            when p_cursor_event_at is null and ranked.trgm_score is not null then ranked.trgm_score
            else 0
          end desc,
          ranked.event_at desc,
          ranked.kind asc,
          ranked.id desc
      ) as rn
    from ranked
  ),
  limited as (
    select *
    from page
    where rn <= (select lim from normalized)
  )
  select
    limited.kind,
    limited.id,
    limited.category_code,
    limited.item_type_code,
    limited.title,
    limited.brand,
    limited.color,
    limited.city_slug,
    limited.neighborhood_slug,
    limited.place_label,
    limited.event_at,
    limited.status,
    limited.created_at,
    limited.photo_path,
    -- Le curseur n'est renvoyé que s'il existe une ligne AU-DELÀ de la page.
    -- Les fonctions existantes le renvoient toujours, ce qui laisse un bouton
    -- « Afficher plus » qui ne mène nulle part sur une dernière page partielle.
    case when exists (select 1 from page where page.rn = (select lim from normalized) + 1)
      then limited.event_at else null end as next_cursor_event_at,
    case when exists (select 1 from page where page.rn = (select lim from normalized) + 1)
      then limited.kind else null end as next_cursor_kind,
    case when exists (select 1 from page where page.rn = (select lim from normalized) + 1)
      then limited.id else null end as next_cursor_id
  from limited
  order by limited.rn;
$$;

revoke execute on function public.search_public_items(text, text, text, text, timestamptz, text, uuid, int) from public, anon, authenticated;
grant execute on function public.search_public_items(text, text, text, text, timestamptz, text, uuid, int) to service_role;
