create or replace function public.match_sweep_candidates(
  p_window_days int default 90,
  p_limit int default 200
)
returns table (lost_item_id uuid, found_item_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct l.id as lost_item_id, f.id as found_item_id
  from lost_items l
  join found_items f
    on f.city_slug = l.city_slug
   and (
     l.category_code = f.category_code
     or l.item_type_code = f.item_type_code
     or exists (
       select 1
       from item_categories c1
       join item_categories c2 on c2.parent_id = c1.parent_id and c1.parent_id is not null
       where c1.code = l.category_code and c2.code = f.category_code and c1.id <> c2.id
     )
   )
   and f.found_at between (l.occurred_at - interval '1 day')
                      and (l.occurred_at + make_interval(days => p_window_days))
   and l.occurred_at between (f.found_at - make_interval(days => p_window_days))
                          and (f.found_at + interval '1 day')
  where l.status in ('DECLARED', 'SEARCHING', 'MATCH_FOUND')
    and f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED')
    and l.occurred_at > now() - make_interval(days => p_window_days)
    and (
      not exists (
        select 1 from matches m
        where m.lost_item_id = l.id
          and m.found_item_id = f.id
      )
      or exists (
        select 1 from matches m
        where m.lost_item_id = l.id
          and m.found_item_id = f.id
          and m.status not in ('CLAIMED', 'REJECTED', 'EXPIRED', 'CONVERTED')
          and m.updated_at < now() - interval '24 hours'
      )
    )
  order by l.id, f.id
  limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.upsert_match(
  p_lost_item_id uuid,
  p_found_item_id uuid,
  p_score numeric,
  p_level match_level,
  p_breakdown jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status match_status;
begin
  insert into matches (lost_item_id, found_item_id, score, level, breakdown)
  values (p_lost_item_id, p_found_item_id, p_score, p_level, p_breakdown)
  on conflict (lost_item_id, found_item_id) do update
    set score = excluded.score,
        level = excluded.level,
        breakdown = excluded.breakdown,
        updated_at = now()
  returning id, status into v_id, v_status;

  if p_score >= 70 and v_status not in ('CLAIMED', 'REJECTED', 'EXPIRED', 'CONVERTED') then
    insert into notifications (user_id, kind, channel, title, body, payload, sent_at)
    select
      l.user_id,
      'MATCH_FOUND',
      'WEB',
      'Correspondance trouvée',
      'Un objet trouvé correspond potentiellement à votre déclaration « ' || l.title || ' ».',
      jsonb_build_object('match_id', v_id, 'score', p_score, 'level', p_level),
      now()
    from lost_items l
    join matches m on m.id = v_id
    where l.id = p_lost_item_id
      and m.notified_owner_at is null;

    update matches
      set notified_owner_at = now()
      where id = v_id
        and notified_owner_at is null;

    insert into notifications (user_id, kind, channel, title, body, payload, sent_at)
    select
      f.finder_id,
      'MATCH_FOUND',
      'WEB',
      'Correspondance très probable',
      'Votre objet trouvé « ' || f.title || ' » correspond à une déclaration de perte.',
      jsonb_build_object('match_id', v_id, 'score', p_score, 'level', p_level),
      now()
    from found_items f
    join matches m on m.id = v_id
    where f.id = p_found_item_id
      and f.finder_id is not null
      and m.notified_finder_at is null
      and (
        p_score >= 90
        or (
          p_level = 'POSSIBLE'
          and f.found_at <= now() - interval '7 days'
        )
      );

    update matches
      set notified_finder_at = now()
      where id = v_id
        and notified_finder_at is null
        and exists (
          select 1 from found_items f
          where f.id = p_found_item_id
            and f.finder_id is not null
            and (
              p_score >= 90
              or (
                p_level = 'POSSIBLE'
                and f.found_at <= now() - interval '7 days'
              )
            )
        );

    update lost_items
      set status = 'MATCH_FOUND'
      where id = p_lost_item_id
        and status in ('DECLARED', 'SEARCHING');
  end if;

  return v_id;
end;
$$;

create or replace function public.run_saved_search_alerts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search record;
  v_new_count int := 0;
  v_items jsonb;
  v_today_alerts int;
begin
  for v_search in
    select *
    from saved_searches
    where is_active
      and (last_run_at is null or last_run_at < now() - interval '30 minutes')
    order by last_run_at nulls first
    limit 50
    for update skip locked
  loop
    select coalesce(jsonb_agg(p), '[]'::jsonb)
    into v_items
    from (
      select f.id, f.title, f.city_slug, f.neighborhood_slug, f.found_at
      from found_items f
      where f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED')
        and f.created_at > coalesce(v_search.last_run_at, now() - interval '7 days')
        and (
          nullif(btrim(v_search.query), '') is null
          or f.search_vector @@ plainto_tsquery('french', v_search.query)
        )
        and (nullif(btrim(v_search.category_code), '') is null or f.category_code = v_search.category_code)
        and (nullif(btrim(v_search.city_slug), '') is null or f.city_slug = v_search.city_slug)
        and (nullif(btrim(v_search.neighborhood_slug), '') is null or f.neighborhood_slug = v_search.neighborhood_slug)
        and (nullif(btrim(v_search.item_type_code), '') is null or f.item_type_code = v_search.item_type_code)
      order by f.created_at desc, f.id desc
      limit 10
    ) p;

    select count(*)
    into v_today_alerts
    from notifications
    where user_id = v_search.user_id
      and kind = 'SEARCH_ALERT'
      and created_at >= date_trunc('day', now());

    if jsonb_array_length(v_items) > 0 and v_today_alerts < 3 then
      insert into notifications (user_id, kind, channel, title, body, payload, sent_at)
      values (
        v_search.user_id,
        'SEARCH_ALERT',
        'WEB',
        'Nouveaux objets pour votre recherche',
        coalesce(v_search.label, v_search.query, 'Votre recherche enregistrée') ||
          ' — ' || jsonb_array_length(v_items) || ' nouveau(x) objet(s).',
        jsonb_build_object(
          'saved_search_id', v_search.id,
          'items', v_items,
          'count', jsonb_array_length(v_items)
        ),
        now()
      );
      v_new_count := v_new_count + 1;

      update saved_searches
        set last_run_at = now(),
            last_notified_at = now()
        where id = v_search.id;
    else
      update saved_searches
        set last_run_at = now()
        where id = v_search.id;
    end if;
  end loop;

  return v_new_count;
end;
$$;
