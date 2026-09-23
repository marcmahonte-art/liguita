-- =============================================================================
-- Liguita — 0005 · Profils utilisateurs
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.3 et §4.5
--
-- `profiles` prolonge `auth.users` (Supabase Auth) avec les attributs métier.
-- Elle est en relation 1:1 : la clé primaire EST la clé étrangère vers auth.users.
--
-- RLS : chaque utilisateur ne lit et ne modifie que son propre profil ; les
-- modérateurs et administrateurs peuvent lire tous les profils.
-- =============================================================================

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text not null,
  phone_verified  boolean not null default false,
  full_name       text,
  display_name    text,
  avatar_url      text,
  country_code    char(2) not null default 'TD',
  city_slug       text,
  locale          text not null default 'fr',
  app_role        app_role not null default 'USER',
  trust_score     int not null default 50 check (trust_score between 0 and 100),
  is_samaritan    boolean not null default false,
  is_blocked      boolean not null default false,
  blocked_reason  text,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

comment on table profiles is
  'Profil métier d''un utilisateur, prolongeant auth.users (Supabase Auth).';

create index profiles_phone_idx on profiles (phone);
create index profiles_city_idx on profiles (city_slug) where city_slug is not null;

-- -----------------------------------------------------------------------------
-- Trigger : création automatique du profil à l'inscription
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, phone_verified)
  values (
    new.id,
    coalesce(new.phone, ''),
    coalesce(new.phone_confirmed_at is not null, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Insère une ligne dans profiles à chaque création d''utilisateur dans auth.users.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Trigger : mise à jour de updated_at
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table profiles enable row level security;
alter table profiles force row level security;

grant select, update on profiles to authenticated;
grant insert on profiles to authenticated;

-- Lecture : son propre profil, ou tous les profils pour modérateur/admin.
create policy profile_select_self on profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

-- Écriture : uniquement son propre profil.
-- `app_role` et `trust_score` ne sont jamais modifiables par l'utilisateur :
-- ce sont des attributs de confiance pilotés par la plateforme.
create policy profile_update_self on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Insertion : uniquement le trigger (security definer) ou l'utilisateur pour son id.
create policy profile_insert_self on profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
