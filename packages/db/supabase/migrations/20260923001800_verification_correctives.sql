create or replace function public.apply_verification_decision(
  p_match_id uuid,
  p_claimant_id uuid,
  p_status claim_status,
  p_score int,
  p_increment_attempt boolean
)
returns table (
  claim_id uuid,
  attempt_count int,
  locked boolean,
  attempt_incremented boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim claims%rowtype;
  v_attempt_incremented boolean := false;
  v_locked boolean := false;
begin
  insert into claims (match_id, claimant_id, status, score, attempt_count)
  values (p_match_id, p_claimant_id, 'DRAFT', greatest(least(p_score, 100), 0), 0)
  on conflict (match_id, claimant_id) do nothing;

  select * into v_claim
  from claims
  where match_id = p_match_id and claimant_id = p_claimant_id
  for update;

  if v_claim.id is null then
    raise exception 'Claim introuvable';
  end if;

  if v_claim.status = 'APPROVED' then
    return query select v_claim.id, v_claim.attempt_count, true, false;
    return;
  end if;

  if p_increment_attempt and v_claim.attempt_count < 3 then
    v_claim.attempt_count := v_claim.attempt_count + 1;
    v_attempt_incremented := true;
  end if;

  v_locked := v_claim.attempt_count >= 3;

  update claims
  set status = p_status,
      score = greatest(least(p_score, 100), 0),
      attempt_count = v_claim.attempt_count,
      updated_at = now()
  where id = v_claim.id;

  return query select v_claim.id, v_claim.attempt_count, v_locked, v_attempt_incremented;
end;
$$;

revoke execute on function public.apply_verification_decision(uuid, uuid, claim_status, int, boolean) from public, anon, authenticated;
grant execute on function public.apply_verification_decision(uuid, uuid, claim_status, int, boolean) to service_role;

create or replace function public.is_match_party(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from matches m
    join lost_items l on l.id = m.lost_item_id
    join found_items f on f.id = m.found_item_id
    where m.id = p_match_id
      and (
        l.user_id = (select auth.uid())
        or f.finder_id = (select auth.uid())
      )
  ) or public.is_platform_staff();
$$;

drop policy claims_update_owner_or_staff on claims;
create policy claims_update_owner_or_staff on claims
  for update to authenticated
  using (
    (
      claimant_id = (select auth.uid())
      and status in ('DRAFT', 'QUESTIONS_SENT', 'ANSWERS_SUBMITTED', 'REJECTED')
    )
    or public.is_platform_staff()
  )
  with check (
    (
      claimant_id = (select auth.uid())
      and status in ('DRAFT', 'QUESTIONS_SENT', 'ANSWERS_SUBMITTED', 'REJECTED', 'UNDER_REVIEW', 'APPROVED')
    )
    or public.is_platform_staff()
  );

drop policy verification_answers_select_staff on verification_answers;
create policy verification_answers_select_staff on verification_answers
  for select to authenticated
  using (public.is_platform_staff());

drop policy verification_answers_update_staff on verification_answers;
create policy verification_answers_update_staff on verification_answers
  for update to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

drop policy fraud_cases_select_staff on fraud_cases;
create policy fraud_cases_select_staff on fraud_cases
  for select to authenticated
  using (public.is_platform_staff());

drop policy fraud_cases_update_staff on fraud_cases;
create policy fraud_cases_update_staff on fraud_cases
  for update to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

drop policy found_item_secrets_owner_all on found_item_secrets;
create policy found_item_secrets_owner_all on found_item_secrets
  for all to authenticated
  using (
    exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
    or public.is_platform_staff()
  )
  with check (
    exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
    or public.is_platform_staff()
  );
