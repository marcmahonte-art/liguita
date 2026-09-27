-- ============================================================
-- 20260923003200_identity_document_storage.sql
-- Sécurisation du stockage des pièces d'identité (RLS Storage)
-- ============================================================
-- Permet au déclarant légitime d'une perte (claimant) de téléverser et
-- consulter sa pièce d'identité (CNI, Passeport, Permis) liée à une
-- correspondance, tout en maintenant le bucket strictement privé et
-- en interdisant à quiconque d'autre (hors modérateur/admin) d'y accéder.
-- ============================================================

create or replace function public.can_manage_verification_evidence(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  -- Cas 1 : Pièces justificatives liées à une réponse de vérification (existant)
  select exists (
    select 1
    from public.verification_answers va
    join public.claims c on c.id = va.claim_id
    where va.id::text = split_part(object_name, '/', 2)
      and object_name ~* '^VERIFICATION/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpe?g|png|webp|avif)$'
      and (
        c.claimant_id = (select auth.uid())
        or public.is_platform_staff()
      )
      and c.status in ('UNDER_REVIEW', 'REJECTED')
  )
  or
  -- Cas 2 : Pièce d'identité fournie par le déclarant de perte pour une correspondance
  -- Chemin attendu : VERIFICATION/identities/<match_id>/<uuid>.<ext>
  exists (
    select 1
    from public.matches m
    join public.lost_items li on li.id = m.lost_item_id
    where m.id::text = split_part(object_name, '/', 3)
      and object_name ~* '^VERIFICATION/identities/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpe?g|png|webp|avif)$'
      and (
        li.user_id = (select auth.uid())
        or public.is_platform_staff()
      )
  );
$$;

-- S'assurer que les politiques RLS sur storage.objects couvrent insert, select, update, delete
drop policy if exists verification_evidence_select on storage.objects;
drop policy if exists verification_evidence_insert on storage.objects;
drop policy if exists verification_evidence_update on storage.objects;
drop policy if exists verification_evidence_delete on storage.objects;

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

create policy verification_evidence_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'verification-evidence'
    and (select public.can_manage_verification_evidence(name))
  )
  with check (
    bucket_id = 'verification-evidence'
    and (select public.can_manage_verification_evidence(name))
  );

create policy verification_evidence_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-evidence'
    and (select public.can_manage_verification_evidence(name))
  );
