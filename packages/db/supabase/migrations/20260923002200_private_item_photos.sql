insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_item_photo(
  p_item_kind text,
  p_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select public.is_platform_staff())
    or (
      p_item_kind = 'LOST'
      and exists (
        select 1
        from lost_items li
        where li.id = p_item_id
          and li.user_id = (select auth.uid())
      )
    )
    or (
      p_item_kind = 'FOUND'
      and exists (
        select 1
        from found_items fi
        where fi.id = p_item_id
          and fi.finder_id = (select auth.uid())
      )
    );
$$;

create or replace function public.can_manage_item_photo_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
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

revoke all on table storage.objects from anon;
revoke all on table item_photos from anon;

grant select, insert, delete on table item_photos to authenticated;

drop policy if exists item_photos_select on item_photos;
drop policy if exists item_photos_insert on item_photos;
drop policy if exists item_photos_delete on item_photos;

create policy item_photos_select on item_photos
  for select to authenticated
  using (public.can_manage_item_photo(item_kind, item_id));

create policy item_photos_insert on item_photos
  for insert to authenticated
  with check (public.can_manage_item_photo(item_kind, item_id));

create policy item_photos_delete on item_photos
  for delete to authenticated
  using (public.can_manage_item_photo(item_kind, item_id));

drop policy if exists item_photos_storage_select on storage.objects;
drop policy if exists item_photos_storage_insert on storage.objects;
drop policy if exists item_photos_storage_delete on storage.objects;

create policy item_photos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos' and public.can_manage_item_photo_path(name));

create policy item_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and public.can_manage_item_photo_path(name));

create policy item_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and public.can_manage_item_photo_path(name));

revoke all on function public.can_manage_item_photo(text, uuid) from public;
revoke all on function public.can_manage_item_photo_path(text) from public;
grant execute on function public.can_manage_item_photo(text, uuid) to authenticated;
grant execute on function public.can_manage_item_photo_path(text) to authenticated;
