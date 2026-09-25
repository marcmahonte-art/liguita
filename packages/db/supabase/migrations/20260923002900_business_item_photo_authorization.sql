create or replace function public.can_access_item_photo(
  p_item_kind text,
  p_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    (select public.is_platform_staff())
    or (
      p_item_kind = 'LOST'
      and exists (
        select 1 from public.lost_items li
        where li.id = p_item_id and li.user_id = (select auth.uid())
      )
    )
    or (
      p_item_kind = 'FOUND'
      and exists (
        select 1
        from public.found_items fi
        where fi.id = p_item_id
          and (
            (fi.organization_id is null and fi.finder_id = (select auth.uid()))
            or (
              fi.organization_id is not null
              and public.can_access_organization_location(fi.organization_id, fi.location_id)
            )
          )
      )
    );
$$;

create or replace function public.can_manage_item_photo(
  p_item_kind text,
  p_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    (select public.is_platform_staff())
    or (
      p_item_kind = 'LOST'
      and exists (
        select 1 from public.lost_items li
        where li.id = p_item_id and li.user_id = (select auth.uid())
      )
    )
    or (
      p_item_kind = 'FOUND'
      and exists (
        select 1
        from public.found_items fi
        where fi.id = p_item_id
          and (
            (fi.organization_id is null and fi.finder_id = (select auth.uid()))
            or (
              fi.organization_id is not null
              and public.can_manage_organization_location(fi.organization_id, fi.location_id)
            )
          )
      )
    );
$$;

create or replace function public.can_access_item_photo_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select case
    when p_path !~ '^(LOST|FOUND)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
      then false
    else public.can_access_item_photo(
      split_part(p_path, '/', 1),
      split_part(p_path, '/', 2)::uuid
    )
  end;
$$;

create or replace function public.can_manage_item_photo_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select case
    when p_path !~ '^(LOST|FOUND)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
      then false
    else public.can_manage_item_photo(
      split_part(p_path, '/', 1),
      split_part(p_path, '/', 2)::uuid
    )
  end;
$$;

drop policy if exists item_photos_select on item_photos;
drop policy if exists item_photos_insert on item_photos;
drop policy if exists item_photos_delete on item_photos;
drop policy if exists item_photos_storage_select on storage.objects;
drop policy if exists item_photos_storage_insert on storage.objects;
drop policy if exists item_photos_storage_delete on storage.objects;

create policy item_photos_select on item_photos
  for select to authenticated
  using (public.can_access_item_photo(item_kind, item_id));

create policy item_photos_insert on item_photos
  for insert to authenticated
  with check (public.can_manage_item_photo(item_kind, item_id));

create policy item_photos_delete on item_photos
  for delete to authenticated
  using (public.can_manage_item_photo(item_kind, item_id));

create policy item_photos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos' and public.can_access_item_photo_path(name));

create policy item_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and public.can_manage_item_photo_path(name));

create policy item_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and public.can_manage_item_photo_path(name));

revoke execute on function public.can_access_item_photo(text, uuid) from public, anon;
revoke execute on function public.can_manage_item_photo(text, uuid) from public, anon;
revoke execute on function public.can_access_item_photo_path(text) from public, anon;
revoke execute on function public.can_manage_item_photo_path(text) from public, anon;
grant execute on function public.can_access_item_photo(text, uuid) to authenticated;
grant execute on function public.can_manage_item_photo(text, uuid) to authenticated;
grant execute on function public.can_access_item_photo_path(text) to authenticated;
grant execute on function public.can_manage_item_photo_path(text) to authenticated;
