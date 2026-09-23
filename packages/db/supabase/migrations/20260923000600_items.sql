-- =============================================================================
-- Liguita — 0006 · Objets perdus et trouvés
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.3 et §4.5
--
-- Deux tables jumelles (lost_items / found_items) plutôt qu'une seule table
-- « items » avec un discriminant : les colonnes de cycle de vie diffèrent
-- (lost_status vs item_status), et les règles RLS aussi.
--
-- Les slugs (`category_code`, `item_type_code`, `city_slug`, `neighborhood_slug`)
-- référencent le référentiel statique de `@liguita/config` / des migrations 0002,
-- pas des UUID : ils restent stables d'un environnement à l'autre.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Objets perdus
-- -----------------------------------------------------------------------------

create table lost_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  category_code       text not null,
  item_type_code      text not null,
  title               text not null,
  description         text,
  brand               text,
  color               text,
  city_slug           text not null,
  neighborhood_slug   text,
  place_label         text not null,
  occurred_at         timestamptz not null,
  status              lost_status not null default 'DECLARED',
  declared_value_xaf  int check (declared_value_xaf is null or declared_value_xaf >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table lost_items is
  'Déclarations « j''ai perdu », publiées par le propriétaire.';

create index lost_items_user_idx on lost_items (user_id);
create index lost_items_status_idx on lost_items (status);
create index lost_items_city_idx on lost_items (city_slug);
create index lost_items_type_idx on lost_items (item_type_code);
create index lost_items_occurred_idx on lost_items (occurred_at desc);
create index lost_items_title_trgm_idx on lost_items using gin (title gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Objets trouvés
-- -----------------------------------------------------------------------------

create table found_items (
  id                  uuid primary key default gen_random_uuid(),
  finder_id           uuid not null references profiles(id) on delete cascade,
  category_code       text not null,
  item_type_code      text not null,
  title               text not null,
  description         text,
  brand               text,
  color               text,
  city_slug           text not null,
  neighborhood_slug   text,
  place_label         text not null,
  found_at            timestamptz not null,
  status              item_status not null default 'FOUND',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table found_items is
  'Déclarations « j''ai trouvé », publiées par le trouveur.';

create index found_items_finder_idx on found_items (finder_id);
create index found_items_status_idx on found_items (status);
create index found_items_city_idx on found_items (city_slug);
create index found_items_type_idx on found_items (item_type_code);
create index found_items_found_idx on found_items (found_at desc);
create index found_items_title_trgm_idx on found_items using gin (title gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Photos (structure prête, upload différé)
-- -----------------------------------------------------------------------------

create table item_photos (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null,
  item_kind      text not null check (item_kind in ('LOST', 'FOUND')),
  url            text not null,
  thumbnail_url  text,
  blurhash       text,
  is_blurred     boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  unique (item_id, item_kind, sort_order)
);

comment on table item_photos is
  'Photos des déclarations. L''upload sera activé dans un incrément ultérieur.';

create index item_photos_item_idx on item_photos (item_id, item_kind);

-- -----------------------------------------------------------------------------
-- Historique des changements de statut
-- -----------------------------------------------------------------------------

create table item_status_history (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null,
  item_kind   text not null check (item_kind in ('LOST', 'FOUND')),
  old_status  text,
  new_status  text not null,
  changed_by  uuid references profiles(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index item_status_history_item_idx on item_status_history (item_id, item_kind);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------

create trigger lost_items_set_updated_at
  before update on lost_items
  for each row execute function public.set_updated_at();

create trigger found_items_set_updated_at
  before update on found_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table lost_items enable row level security;
alter table lost_items force row level security;
alter table found_items enable row level security;
alter table found_items force row level security;
alter table item_photos enable row level security;
alter table item_photos force row level security;
alter table item_status_history enable row level security;
alter table item_status_history force row level security;

grant select, insert, update on lost_items to authenticated;
grant select, insert, update on found_items to authenticated;
grant select, insert on item_photos to authenticated;
grant select on item_status_history to authenticated;

-- lost_items : lecture seule pour le propriétaire (et staff).
-- La vue publique des objets perdus n'est pas encore ouverte (pas de page publique).
create policy lost_items_select_own on lost_items
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

create policy lost_items_insert_own on lost_items
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Mise à jour par le propriétaire. Les colonnes sensibles (user_id) sont protégées
-- par le WITH CHECK : on ne peut pas réattribuer la déclaration à quelqu'un d'autre.
create policy lost_items_update_own on lost_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- found_items : lecture ouverte (vitrine publique future), écriture par le propriétaire.
create policy found_items_select_all on found_items
  for select to anon, authenticated
  using (true);

create policy found_items_insert_own on found_items
  for insert to authenticated
  with check (finder_id = (select auth.uid()));

create policy found_items_update_own on found_items
  for update to authenticated
  using (finder_id = (select auth.uid()))
  with check (finder_id = (select auth.uid()));

-- item_photos : lecture liée au parent (ici, toujours le propriétaire pour l'instant),
-- écriture par le propriétaire de la déclaration.
create policy item_photos_select on item_photos
  for select to authenticated, anon
  using (true);

create policy item_photos_insert on item_photos
  for insert to authenticated
  with check (
    (
      item_kind = 'LOST' and exists (
        select 1 from lost_items li
        where li.id = item_id and li.user_id = (select auth.uid())
      )
    )
    or (
      item_kind = 'FOUND' and exists (
        select 1 from found_items fi
        where fi.id = item_id and fi.finder_id = (select auth.uid())
      )
    )
  );

-- item_status_history : lecture seule pour le propriétaire de la déclaration concernée.
create policy item_status_history_select on item_status_history
  for select to authenticated
  using (
    (
      item_kind = 'LOST' and exists (
        select 1 from lost_items li
        where li.id = item_id and li.user_id = (select auth.uid())
      )
    )
    or (
      item_kind = 'FOUND' and exists (
        select 1 from found_items fi
        where fi.id = item_id and fi.finder_id = (select auth.uid())
      )
    )
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );
