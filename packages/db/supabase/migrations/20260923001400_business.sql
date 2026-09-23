create table organizations (
  id            uuid primary key default gen_random_uuid(),
  country_code  char(2) not null default 'TD' references countries(code),
  name          text not null check (char_length(trim(name)) between 2 and 160),
  slug          text not null unique,
  logo_url      text,
  phone         text,
  email         text,
  address       text,
  sector        text,
  tax_id        text,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table organization_locations (
  id                uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name              text not null check (char_length(trim(name)) between 2 and 160),
  city_slug         text not null,
  neighborhood_slug text,
  address           text,
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  opening_hours     jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (organization_id, name)
);

create table organization_users (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  location_id     uuid references organization_locations(id) on delete cascade,
  role            org_role not null,
  invited_by      uuid references profiles(id) on delete set null,
  accepted_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create unique index organization_users_global_unique on organization_users (organization_id, user_id) where location_id is null;
create unique index organization_users_location_unique on organization_users (organization_id, user_id, location_id) where location_id is not null;
create index organization_users_org_idx on organization_users (organization_id, role);
create index organization_users_location_idx on organization_users (location_id);

create table organization_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  location_id     uuid references organization_locations(id) on delete cascade,
  email           text not null,
  role            org_role not null,
  token           text not null unique,
  invited_by      uuid not null references profiles(id),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index organization_invitations_email_idx on organization_invitations (email, created_at desc);

create table audit_logs (
  id          bigserial primary key,
  actor_id    uuid references profiles(id),
  action      text not null,
  target_kind text,
  target_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_target_idx on audit_logs (target_kind, target_id, created_at desc);

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = (select auth.uid())
      and ou.accepted_at is not null
  );
$$;

create or replace function public.can_access_organization_location(p_organization_id uuid, p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = (select auth.uid())
      and ou.accepted_at is not null
      and (ou.location_id is null or ou.location_id = p_location_id)
  );
$$;

create or replace function public.can_manage_organization_location(p_organization_id uuid, p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = (select auth.uid())
      and ou.accepted_at is not null
      and ou.role in ('OWNER', 'ADMIN', 'MANAGER')
      and (ou.location_id is null or ou.location_id = p_location_id)
  );
$$;

create or replace function public.can_administer_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = (select auth.uid())
      and ou.accepted_at is not null
      and ou.role in ('OWNER', 'ADMIN')
  );
$$;

create or replace function public.create_organization(p_name text, p_sector text, p_city_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if char_length(trim(p_name)) < 2 then raise exception 'Nom invalide'; end if;
  v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into organizations (name, slug, sector) values (trim(p_name), v_slug, nullif(trim(p_sector), '')) returning id into v_id;
  insert into organization_users (organization_id, user_id, role) values (v_id, (select auth.uid()), 'OWNER');
  insert into audit_logs (actor_id, action, target_kind, target_id, after) values ((select auth.uid()), 'organization.create', 'organization', v_id, jsonb_build_object('name', trim(p_name)));
  return v_id;
end;
$$;

create or replace function public.create_organization_location(
  p_organization_id uuid,
  p_name text,
  p_city_slug text,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_administer_organization(p_organization_id) then raise exception 'Accès refusé'; end if;
  insert into organization_locations (organization_id, name, city_slug, address)
  values (p_organization_id, trim(p_name), trim(p_city_slug), nullif(trim(p_address), ''))
  returning id into v_id;
  insert into audit_logs (actor_id, action, target_kind, target_id, after) values ((select auth.uid()), 'organization_location.create', 'organization_location', v_id, jsonb_build_object('name', trim(p_name)));
  return v_id;
end;
$$;

create or replace function public.invite_organization_member(
  p_organization_id uuid,
  p_email text,
  p_role org_role,
  p_location_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.can_administer_organization(p_organization_id) then raise exception 'Accès refusé'; end if;
  if p_role = 'OWNER' then raise exception 'Le rôle OWNER est réservé au fondateur'; end if;
  if p_location_id is not null and not public.can_administer_organization(p_organization_id) then raise exception 'Accès refusé'; end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into organization_invitations (organization_id, location_id, email, role, token, invited_by)
  values (p_organization_id, p_location_id, lower(trim(p_email)), p_role, v_token, (select auth.uid()));
  return v_token;
end;
$$;

create or replace function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation organization_invitations%rowtype;
  v_user uuid := (select auth.uid());
begin
  select * into v_invitation from organization_invitations where token = p_token for update;
  if v_invitation.id is null or v_invitation.accepted_at is not null or v_invitation.expires_at <= now() then raise exception 'Invitation invalide'; end if;
  if lower(coalesce((select auth.jwt() ->> 'email'), '')) <> v_invitation.email then raise exception 'Invitation invalide'; end if;
  insert into organization_users (organization_id, user_id, location_id, role, invited_by)
  values (v_invitation.organization_id, v_user, v_invitation.location_id, v_invitation.role, v_invitation.invited_by)
  on conflict do nothing;
  update organization_invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

revoke execute on function public.create_organization(text, text, text) from public;
revoke execute on function public.create_organization_location(uuid, text, text, text) from public;
revoke execute on function public.invite_organization_member(uuid, text, org_role, uuid) from public;
revoke execute on function public.accept_organization_invitation(text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;
grant execute on function public.create_organization_location(uuid, text, text, text) to authenticated;
grant execute on function public.invite_organization_member(uuid, text, org_role, uuid) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;

alter table organizations enable row level security;
alter table organizations force row level security;
alter table organization_locations enable row level security;
alter table organization_locations force row level security;
alter table organization_users enable row level security;
alter table organization_users force row level security;
alter table organization_invitations enable row level security;
alter table organization_invitations force row level security;
alter table audit_logs enable row level security;
alter table audit_logs force row level security;

grant select on organizations to authenticated;
grant select, insert, update on organization_locations to authenticated;
grant select on organization_users to authenticated;
grant select on organization_invitations to authenticated;

create policy organizations_select_members on organizations
  for select to authenticated using (public.is_organization_member(id));
create policy locations_select_authorized on organization_locations
  for select to authenticated using (public.can_access_organization_location(organization_id, id));
create policy locations_insert_admin on organization_locations
  for insert to authenticated with check (public.can_administer_organization(organization_id));
create policy locations_update_admin on organization_locations
  for update to authenticated using (public.can_administer_organization(organization_id)) with check (public.can_administer_organization(organization_id));
create policy organization_users_select_same_org on organization_users
  for select to authenticated using (public.is_organization_member(organization_id));
create policy invitations_select_admin on organization_invitations
  for select to authenticated using (public.can_administer_organization(organization_id));

alter table found_items add column if not exists public_ref text;
alter table found_items add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table found_items add column if not exists location_id uuid references organization_locations(id) on delete set null;
alter table found_items add column if not exists created_by uuid references profiles(id) on delete set null;
alter table found_items add column if not exists building text;
alter table found_items add column if not exists floor text;
alter table found_items add column if not exists storage_zone text;
alter table found_items add column if not exists cabinet text;
alter table found_items add column if not exists locker text;
alter table found_items add column if not exists internal_ref text;
alter table found_items add column if not exists internal_notes text;
alter table found_items add column if not exists is_public boolean not null default true;
alter table found_items add column if not exists qr_code text unique;
alter table found_items alter column finder_id drop not null;
alter table found_items add constraint found_items_origin_check check (finder_id is not null or (organization_id is not null and location_id is not null));

create index found_items_organization_idx on found_items (organization_id, status, created_at desc);
create index found_items_location_idx on found_items (location_id, status, created_at desc);
create unique index found_items_public_ref_idx on found_items (public_ref) where public_ref is not null;

drop policy if exists found_items_select_all on found_items;
drop policy if exists found_items_insert_own on found_items;
drop policy if exists found_items_update_own on found_items;
create policy found_items_select_scoped on found_items
  for select to authenticated using (
    finder_id = (select auth.uid())
    or (organization_id is not null and public.can_access_organization_location(organization_id, location_id))
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );
create policy found_items_insert_own on found_items
  for insert to authenticated with check (finder_id = (select auth.uid()));
create policy found_items_insert_business on found_items
  for insert to authenticated with check (
    organization_id is not null
    and public.can_manage_organization_location(organization_id, location_id)
  );
create policy found_items_update_own on found_items
  for update to authenticated using (finder_id = (select auth.uid())) with check (finder_id = (select auth.uid()));
create policy found_items_update_business on found_items
  for update to authenticated using (
    organization_id is not null and public.can_manage_organization_location(organization_id, location_id)
  ) with check (
    organization_id is not null and public.can_manage_organization_location(organization_id, location_id)
  );

drop policy if exists item_photos_select on item_photos;
create policy item_photos_select on item_photos
  for select to authenticated using (
    exists (
      select 1 from found_items fi
      where fi.id = item_id and (
        fi.finder_id = (select auth.uid())
        or (fi.organization_id is not null and public.can_access_organization_location(fi.organization_id, fi.location_id))
      )
    )
  );

create or replace view public_found_items
with (security_invoker = off) as
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
  (select count(*)::int from item_photos p where p.item_kind = 'FOUND' and p.item_id = f.id) as photo_count,
  case when f.description is null then null else left(immutable_unaccent(f.description), 120) end as description_preview
from found_items f
where f.is_public = true
  and f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED');

create policy matches_select_business on matches
  for select to authenticated using (
    exists (
      select 1 from found_items fi
      where fi.id = found_item_id
        and fi.organization_id is not null
        and public.can_access_organization_location(fi.organization_id, fi.location_id)
    )
  );
