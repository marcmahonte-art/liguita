-- =============================================================================
-- Liguita — 0009 · Correspondances, notifications, recherches sauvegardées
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.3, §6.4–6.6, Sprint 4
--
-- 4.2  Table `matches` + RLS
-- 4.3  Pré-filtrage SQL : match_candidates_for_found / match_candidates_for_lost
-- 4.5  Squelette de balayage (appelé par le worker externe / API cron)
-- 4.7  `saved_searches` + `notifications` (alertes de recherche)
--
-- Le SCORE n'est pas calculé en base : pré-filtrage SQL + score TypeScript
-- dans `@liguita/core/matching` (séparabilité des responsabilités §6.4).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.2 — Correspondances
-- -----------------------------------------------------------------------------

create table matches (
  id                  uuid primary key default gen_random_uuid(),
  lost_item_id        uuid not null references lost_items(id) on delete cascade,
  found_item_id       uuid not null references found_items(id) on delete cascade,

  score               numeric(5,2) not null check (score between 0 and 100),
  level               match_level not null,
  breakdown           jsonb not null,
  algorithm_version   text not null default 'v1',

  status              match_status not null default 'NEW',
  notified_owner_at   timestamptz,
  notified_finder_at  timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (lost_item_id, found_item_id)
);

comment on table matches is
  'Paire (perdu, trouvé) avec score de correspondance. Le statut CLAIMED/REJECTED ne jamais écrasé par un balayage.';

create index matches_lost_idx on matches (lost_item_id, score desc);
create index matches_found_idx on matches (found_item_id, score desc);
create index matches_status_idx on matches (status, created_at desc);
create index matches_level_idx on matches (level, score desc);

create trigger matches_set_updated_at
  before update on matches
  for each row execute function public.set_updated_at();

alter table matches enable row level security;
alter table matches force row level security;

grant select, insert, update on matches to authenticated;

-- Lecture : propriétaire de la perte OU propriétaire de la trouvaille OR staff.
create policy matches_select_parties on matches
  for select to authenticated
  using (
    exists (
      select 1 from lost_items l
      where l.id = lost_item_id and l.user_id = (select auth.uid())
    )
    or exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

-- Insert / update : uniquement si on est partie à la paire.
-- (Le worker tourne en service_role et contourne la RLS.)
create policy matches_insert_parties on matches
  for insert to authenticated
  with check (
    exists (
      select 1 from lost_items l
      where l.id = lost_item_id and l.user_id = (select auth.uid())
    )
    or exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
  );

create policy matches_update_parties on matches
  for update to authenticated
  using (
    exists (
      select 1 from lost_items l
      where l.id = lost_item_id and l.user_id = (select auth.uid())
    )
    or exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from lost_items l
      where l.id = lost_item_id and l.user_id = (select auth.uid())
    )
    or exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- Notifications (4.7 / §6.5)
-- -----------------------------------------------------------------------------

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,
  channel     text not null default 'WEB',
  title       text not null,
  body        text,
  payload     jsonb,
  sent_at     timestamptz,
  read_at     timestamptz,
  error       text,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;
alter table notifications force row level security;

grant select, update on notifications to authenticated;

create policy notifications_select_own on notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Pas de policy INSERT pour authenticated : seules les fonctions serveur
-- (service_role) empilent les notifications.

-- -----------------------------------------------------------------------------
-- Recherches sauvegardées (4.7 / §6.6 — Innovation #2, P0)
-- -----------------------------------------------------------------------------
-- Adapté au schéma réel : slug codes (category_code, city_slug…) au lieu des
-- UUID du plan, pour rester aligné sur lost_items / found_items.

create table saved_searches (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  label              text,
  query              text,
  category_code      text,
  city_slug          text,
  neighborhood_slug  text,
  item_type_code     text,
  channels           text[] not null default '{WEB}',
  is_active          boolean not null default true,
  last_run_at        timestamptz,
  last_notified_at   timestamptz,
  created_at         timestamptz not null default now()
);

create index saved_searches_active_idx on saved_searches (is_active, last_run_at);
create index saved_searches_user_idx on saved_searches (user_id, created_at desc);

alter table saved_searches enable row level security;
alter table saved_searches force row level security;

grant select, insert, update, delete on saved_searches to authenticated;

create policy saved_searches_crud_own on saved_searches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 4.3 — Pré-filtrage SQL : candidats
-- -----------------------------------------------------------------------------
-- Symétrique pour lost → found et found → lost (§6.4).
-- N'agit QUE sur le pré-filtrage : le score est calculé en TypeScript.
-- S'adapte au schéma réel (slug codes, pas d'UUID de catégories en items).

create or replace function public.match_candidates_for_found(
  p_found_id uuid,
  p_window_days int default 90
)
returns table (lost_item_id uuid)
language sql
stable
security invoker
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
        -- catégories sœurs via le parent
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

comment on function public.match_candidates_for_found(uuid, int) is
  'Pré-filtrage : pertes candidates pour une trouvaille donnée. Le score est calculé hors base (@liguita/core).';

create or replace function public.match_candidates_for_lost(
  p_lost_id uuid,
  p_window_days int default 90
)
returns table (found_item_id uuid)
language sql
stable
security invoker
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

comment on function public.match_candidates_for_lost(uuid, int) is
  'Pré-filtrage symétrique : trouvailles candidates pour une perte donnée.';

-- -----------------------------------------------------------------------------
-- Upsert de correspondance (appelé après calcul TypeScript)
-- -----------------------------------------------------------------------------
-- N'écrase JAMAIS le statut d'un match existant (CLAIMED, REJECTED) —
-- règle du §6.5 étape 5 : un balayage ne ressuscite pas un match rejeté.

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

  -- Notification : score ≥ 70 (POSSIBLE) et premier passage (NEW).
  if p_score >= 70 and v_status = 'NEW' then
    -- Propriétaire de la perte
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
    where l.id = p_lost_item_id
      and not exists (
        select 1 from matches m
        where m.id = v_id and m.notified_owner_at is not null
      );

    update matches set notified_owner_at = now() where id = v_id;

    -- Très probable (≥ 90) : aussi le trouveur
    if p_score >= 90 then
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
      where f.id = p_found_item_id;

      update matches set notified_finder_at = now() where id = v_id;
    end if;

    -- Propriétaire de la perte : marquer MATCH_FOUND si encore DECLARED
    update lost_items
      set status = 'MATCH_FOUND'
      where id = p_lost_item_id
        and status in ('DECLARED', 'SEARCHING');
  end if;

  return v_id;
end;
$$;

comment on function public.upsert_match(uuid, uuid, numeric, match_level, jsonb) is
  'Insère ou met à jour une correspondance SANS écraser le statut (CLAIMED/REJECTED). Notifie si score ≥ 70.';

-- Exécution réservée aux rôles API (app via service_role ou RLS parties).
revoke execute on function public.upsert_match(uuid, uuid, numeric, match_level, jsonb) from public;
grant execute on function public.upsert_match(uuid, uuid, numeric, match_level, jsonb) to authenticated, service_role;

-- Les fonctions de pré-filtrage sont SECURITY INVOKER et lisent via RLS :
-- un utilisateur authentifié ne voit que SES lost_items dans match_candidates_for_lost.
-- Le worker (service_role) voit tout.
grant execute on function public.match_candidates_for_found(uuid, int) to authenticated, service_role;
grant execute on function public.match_candidates_for_lost(uuid, int) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4.5 — Balayage (appelé par le worker / API cron, via service_role)
-- -----------------------------------------------------------------------------
-- Retourne le nombre de paires évaluées pour le journal du worker.
-- Le scoring se fait hors base : cette fonction ne fait que lister les
-- « objets à balayer » et laisser le worker charger les paires.

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
    and not exists (
      select 1 from matches m
      where m.lost_item_id = l.id
        and m.found_item_id = f.id
        and m.status in ('CLAIMED', 'REJECTED', 'CONVERTED')
    )
  order by l.id, f.id
  limit least(greatest(p_limit, 1), 500);
$$;

comment on function public.match_sweep_candidates(int, int) is
  'Paires (lost, found) à réévaluer par le worker match-sweep. Exclut les matchs CLAIMED/REJECTED.';

revoke execute on function public.match_sweep_candidates(int, int) from public;
grant execute on function public.match_sweep_candidates(int, int) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4.7 — Worker d'alertes saved_searches (appelé par API cron)
-- -----------------------------------------------------------------------------
-- Exécute les recherches actives dont last_run_at > 30 min, empile les
-- notifications WEB, met à jour last_run_at. Anti-spam : max 3 notifs / user / jour.

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
    select * from saved_searches
    where is_active
      and (last_run_at is null or last_run_at < now() - interval '30 minutes')
    order by last_run_at nulls first
    limit 50
  loop
    -- Objets trouvés depuis le dernier run, qui matchent les filtres
    select coalesce(jsonb_agg(p), '[]'::jsonb) into v_items
    from (
      select id, title, city_slug, neighborhood_slug, found_at
      from public_found_items f
      where f.created_at > coalesce(v_search.last_run_at, now() - interval '7 days')
        and (v_search.query is null or f.search_vector @@ plainto_tsquery('french', v_search.query))
        and (v_search.category_code is null or f.category_code = v_search.category_code)
        and (v_search.city_slug is null or f.city_slug = v_search.city_slug)
        and (v_search.neighborhood_slug is null or f.neighborhood_slug = v_search.neighborhood_slug)
        and (v_search.item_type_code is null or f.item_type_code = v_search.item_type_code)
      limit 10
    ) p;

    -- Anti-spam : 3 alertes / jour / utilisateur
    select count(*) into v_today_alerts
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
    end if;

    update saved_searches
      set last_run_at = now(),
          last_notified_at = case when jsonb_array_length(v_items) > 0 then now() else last_notified_at end
      where id = v_search.id;
  end loop;

  return v_new_count;
end;
$$;

comment on function public.run_saved_search_alerts() is
  'Worker d''alertes (§6.6) : max 3 notifications / utilisateur / jour, dédoublonnage par last_run_at.';

revoke execute on function public.run_saved_search_alerts() from public;
grant execute on function public.run_saved_search_alerts() to authenticated, service_role;
