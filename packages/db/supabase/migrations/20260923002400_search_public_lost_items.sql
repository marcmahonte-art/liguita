drop function if exists public.search_public_lost_items(int);

create or replace function public.search_public_lost_items(
  p_query text default null,
  p_category_code text default null,
  p_neighborhood_slug text default null,
  p_cursor_occurred_at timestamptz default null,
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
  occurred_at timestamptz,
  status lost_status,
  created_at timestamptz,
  photo_path text,
  next_cursor_occurred_at timestamptz,
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
      l.id,
      l.category_code,
      l.item_type_code,
      l.title,
      l.brand,
      l.color,
      l.city_slug,
      l.neighborhood_slug,
      l.occurred_at,
      l.status,
      l.created_at,
      (
        select p.url
        from public.item_photos p
        where p.item_kind = 'LOST'
          and p.item_id = l.id
        order by p.sort_order asc, p.created_at asc
        limit 1
      ) as photo_path,
      case
        when n.q is null then null
        else similarity(immutable_unaccent(l.title), n.q)
           + similarity(immutable_unaccent(coalesce(l.description, '')), n.q)
      end as trgm_score,
      case
        when n.q is null then null
        else ts_rank(l.search_vector, websearch_to_tsquery('french', n.q))
      end as fts_rank
    from public.lost_items l
    cross join normalized n
    where l.is_public = true
      and l.status in ('DECLARED', 'SEARCHING')
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
      and (
        p_cursor_occurred_at is null
        or p_cursor_id is null
        or (l.occurred_at, l.id) < (p_cursor_occurred_at, p_cursor_id)
      )
  ),
  page as (
    select
      ranked.*,
      row_number() over (
        order by
          case
            when p_cursor_occurred_at is null and ranked.fts_rank is not null then ranked.fts_rank
            else 0
          end desc,
          case
            when p_cursor_occurred_at is null and ranked.trgm_score is not null then ranked.trgm_score
            else 0
          end desc,
          ranked.occurred_at desc,
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
    limited.occurred_at,
    limited.status,
    limited.created_at,
    limited.photo_path,
    case when limited.rn < (select lim from normalized) + 1 then limited.occurred_at else null end as next_cursor_occurred_at,
    case when limited.rn < (select lim from normalized) + 1 then limited.id else null end as next_cursor_id
  from limited
  order by limited.rn;
$$;

revoke execute on function public.search_public_lost_items(text, text, text, timestamptz, uuid, int) from public, anon, authenticated;
grant execute on function public.search_public_lost_items(text, text, text, timestamptz, uuid, int) to service_role;
