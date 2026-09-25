insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-evidence',
  'verification-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_verification_evidence(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.verification_answers va
    join public.claims c on c.id = va.claim_id
    where va.id::text = split_part(object_name, '/', 2)
      and object_name ~ '^VERIFICATION/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'
      and (
        c.claimant_id = (select auth.uid())
        or public.is_platform_staff()
      )
      and c.status in ('UNDER_REVIEW', 'REJECTED')
  );
$$;

create policy verification_evidence_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-evidence'
    and (select public.can_manage_verification_evidence(name))
  );

create policy verification_evidence_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-evidence'
    and (select public.can_manage_verification_evidence(name))
  );
