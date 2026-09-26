-- ============================================================
-- Identité utilisateur — une seule source de vérité
-- ============================================================
-- L'identifiant unique est `profiles.id`, qui référence `auth.users.id`.
-- Une connexion Google et une connexion email ne peuvent donc pas produire deux
-- profils : Supabase rattache l'identité Google au compte existant lorsque l'email
-- correspond, et le déclencheur ci-dessous enrichit le profil existant au lieu
-- d'en créer un second.
--
-- Ce que la migration ajoute :
--   * `first_name` / `last_name` — le nom du détenteur du compte, saisissable ;
--   * `auth_provider`           — la méthode de connexion réellement utilisée
--                                 (jamais modifiable par l'utilisateur) ;
--   * `handle_new_user`         — réécrite : elle lit les métadonnées du
--                                 fournisseur (Google : prénom, nom, nom complet,
--                                 photo) et en déduit `display_name` ;
--   * `sync_user_identity`      — à la mise à jour de `auth.users` (donc à chaque
--                                 connexion) : complète les champs vides et
--                                 resynchronise l'email, l'avatar et la méthode.
--
-- ⚠️ `display_name` reste une colonne dénormalisée, car elle est lue partout et que
-- la calculer à chaque affichage coûterait une jointure. Elle est écrite à deux
-- endroits, et uniquement deux : `apply_user_identity` (métadonnées fournisseur) et
-- l'action serveur `updateIdentity` (édition par l'utilisateur).
-- ============================================================

-- ------------------------------------------------------------------ Méthode de connexion
do $$
begin
  if not exists (select 1 from pg_type where typname = 'auth_provider') then
    create type auth_provider as enum ('EMAIL', 'GOOGLE', 'PHONE');
  end if;
end;
$$;

alter table profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists auth_provider public.auth_provider not null default 'EMAIL';

comment on column profiles.first_name is
  'Prénom du détenteur du compte. Alimenté par le formulaire d''inscription ou par les métadonnées Google.';
comment on column profiles.last_name is
  'Nom du détenteur du compte.';
comment on column profiles.display_name is
  'Nom affiché (en-tête, menu utilisateur, annonces). Déduit de first_name + last_name.';
comment on column profiles.auth_provider is
  'Méthode de connexion utilisée. Technique : jamais exposée dans l''interface autrement que comme libellé.';

-- ------------------------------------------------------------------ Remplissage initial
-- Les comptes créés avant cette migration n'ont qu'un `full_name` (souvent vide) :
-- on le décompose pour que le prénom et le nom soient exploitables partout.
update profiles p
set
  first_name = nullif(btrim(split_part(btrim(coalesce(p.display_name, p.full_name, '')), ' ', 1)), ''),
  last_name = nullif(
    btrim(regexp_replace(btrim(coalesce(p.display_name, p.full_name, '')), '^\S+\s*', '')),
    ''
  ),
  display_name = nullif(btrim(coalesce(p.display_name, p.full_name)), '')
where coalesce(btrim(coalesce(p.display_name, p.full_name, '')), '') <> '';

-- `auth_provider` des comptes existants : Google si le compte a une identité Google
-- rattachée, sinon email.
update public.profiles p
set auth_provider = case
  when exists (
    select 1
    from auth.users u
    join auth.identities i on i.user_id = u.id
    where u.id = p.id and i.provider = 'google'
  ) then 'GOOGLE'::public.auth_provider
  else 'EMAIL'::public.auth_provider
end;

-- ------------------------------------------------------------------ Application de l'identité
-- ⚠️ `security definer` : le déclencheur s'exécute avec les droits de son auteur
-- car la session qui écrit dans `auth.users` n'a pas les droits sur `profiles`.
--
-- La fonction n'est **jamais** exécutable depuis le client : elle est révoquée pour
-- `public`, `anon` et `authenticated` ci-dessous. Seuls les déclencheurs l'appellent.
create or replace function public.apply_user_identity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u auth.users;
  meta jsonb := '{}'::jsonb;
  existing public.profiles%rowtype;

  v_first text;
  v_last text;
  v_full_from_meta text;
  v_avatar text;
  v_email text;
  v_provider public.auth_provider;

  target_first text;
  target_last text;
  target_full text;
  target_display text;
begin
  select * into u from auth.users where id = p_user_id;
  if u is null then
    return;
  end if;

  meta := coalesce(u.raw_user_meta_data, '{}'::jsonb);

  -- Google fournit `given_name` / `family_name` / `full_name` / `picture`.
  -- Nos propres formulaires fournissent `first_name` / `last_name`.
  -- `full_name` est la convention des deux côtés et sert de filet.
  v_first := nullif(
    btrim(coalesce(meta ->> 'first_name', meta ->> 'given_name', '')),
    ''
  );
  v_last := nullif(
    btrim(coalesce(meta ->> 'last_name', meta ->> 'family_name', '')),
    ''
  );
  v_full_from_meta := nullif(
    btrim(coalesce(meta ->> 'full_name', meta ->> 'name', '')),
    ''
  );

  -- Nom complet seul (Google peut ne renvoyer que `full_name`) : on décompose.
  if (v_first is null or v_last is null) and v_full_from_meta is not null then
    if v_first is null then
      v_first := nullif(btrim(split_part(v_full_from_meta, ' ', 1)), '');
    end if;
    if v_last is null then
      v_last := nullif(
        btrim(regexp_replace(v_full_from_meta, '^\S+\s*', '')),
        ''
      );
    end if;
  end if;

  v_avatar := nullif(
    btrim(coalesce(meta ->> 'avatar_url', meta ->> 'picture', '')),
    ''
  );
  v_email := nullif(btrim(coalesce(u.email, '')), '');

  v_provider := case u.raw_app_meta_data ->> 'provider'
    when 'google' then 'GOOGLE'::public.auth_provider
    when 'phone' then 'PHONE'::public.auth_provider
    else 'EMAIL'::public.auth_provider
  end;

  select * into existing from public.profiles where id = p_user_id;
  if not found then
    return;
  end if;

  -- ⚠️ Les noms saisis par l'utilisateur ne sont jamais écrasés : une reconnexion
  -- Google ne doit pas réécrire un prénom corrigé à la main. Seuls les champs vides
  -- sont complétés.
  target_first := coalesce(nullif(btrim(existing.first_name), ''), v_first);
  target_last := coalesce(nullif(btrim(existing.last_name), ''), v_last);
  target_full := nullif(
    btrim(coalesce(target_first, '') || ' ' || coalesce(target_last, '')),
    ''
  );
  target_display := coalesce(
    target_full,
    nullif(btrim(existing.full_name), ''),
    v_full_from_meta
  );

  -- Ce déclencheur s'exécute à chaque connexion ; sans ce test, chaque `sign-in`
  -- écrirait une ligne identique.
  if existing.first_name is not distinct from target_first
    and existing.last_name is not distinct from target_last
    and existing.display_name is not distinct from target_display
    and existing.full_name is not distinct from coalesce(nullif(btrim(existing.full_name), ''), target_full)
    and existing.avatar_url is not distinct from coalesce(nullif(btrim(existing.avatar_url), ''), v_avatar)
    and existing.email is not distinct from coalesce(nullif(btrim(existing.email), ''), v_email)
    and existing.auth_provider is not distinct from v_provider
  then
    return;
  end if;

  update public.profiles
  set
    first_name = target_first,
    last_name = target_last,
    full_name = coalesce(nullif(btrim(full_name), ''), target_full),
    display_name = target_display,
    avatar_url = coalesce(nullif(btrim(avatar_url), ''), v_avatar),
    email = coalesce(nullif(btrim(email), ''), v_email),
    auth_provider = v_provider
  where id = p_user_id;
end;
$$;

-- ------------------------------------------------------------------ Création de compte
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    email_verified,
    phone,
    phone_verified,
    whatsapp_number,
    airtel_number
  ) values (
    new.id,
    nullif(btrim(coalesce(new.email, '')), ''),
    coalesce(new.email_confirmed_at is not null, false),
    coalesce(new.phone, ''),
    coalesce(new.phone_confirmed_at is not null, false),
    nullif(new.raw_user_meta_data ->> 'whatsapp_number', ''),
    nullif(new.raw_user_meta_data ->> 'airtel_number', '')
  )
  on conflict (id) do nothing;

  -- L'identité (prénom, nom, avatar, display_name) est dérivée des métadonnées du
  -- fournisseur. Elle passe par la même fonction que la mise à jour : une seule règle.
  perform public.apply_user_identity(new.id);

  return new;
end;
$$;

-- ------------------------------------------------------------------ Connexions suivantes
-- `after update on auth.users` se déclenche à chaque connexion (GoTrue met à jour
-- `last_sign_in_at`). C'est ce qui permet à un compte créé par email de récupérer la
-- photo et le nom Google s'il se connecte ensuite « avec Google », **sans créer de
-- second profil** : la ligne existante est complétée.
create or replace function public.sync_user_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_user_identity(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.sync_user_identity();

-- ------------------------------------------------------------------ Droits
-- L'utilisateur modifie son identité et ses préférences, rien d'autre.
-- `auth_provider` n'est délibérément pas accordable : c'est une information
-- technique, et elle se déduit de la façon dont la session a été ouverte.
-- `city_slug` et `locale` sont déjà accordés par la migration 0015.
grant update (first_name, last_name, display_name, phone, is_samaritan) on profiles to authenticated;

-- La fonction d'identité n'est pas exposée au client : elle écrit dans `profiles`.
revoke all on function public.apply_user_identity(uuid) from public, anon, authenticated;
