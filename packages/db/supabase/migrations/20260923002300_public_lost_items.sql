alter table public.lost_items
  add column if not exists is_public boolean not null default false;

create index if not exists lost_items_public_created_idx
  on public.lost_items (created_at desc, id desc)
  where is_public = true and status in ('DECLARED', 'SEARCHING');

create or replace function public.search_public_lost_items(
  p_limit int default 24
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
  photo_path text
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
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
    ) as photo_path
  from public.lost_items l
  where l.is_public = true
    and l.status in ('DECLARED', 'SEARCHING')
  order by l.created_at desc, l.id desc
  limit least(greatest(coalesce(p_limit, 24), 1), 50);
$$;

revoke execute on function public.search_public_lost_items(int) from public, anon, authenticated;
grant execute on function public.search_public_lost_items(int) to service_role;
