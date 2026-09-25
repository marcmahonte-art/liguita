create or replace function public.apply_verification_submission(
  p_match_id uuid,
  p_claimant_id uuid,
  p_status claim_status,
  p_score int,
  p_increment_attempt boolean,
  p_answers jsonb
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

  if v_claim.status = 'UNDER_REVIEW' then
    raise exception 'Vérification déjà en revue';
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

  delete from verification_answers where claim_id = v_claim.id;

  insert into verification_answers (
    claim_id,
    question_id,
    answer,
    is_correct,
    points_awarded
  )
  select
    v_claim.id,
    (entry ->> 'question_id')::uuid,
    entry ->> 'answer',
    (entry ->> 'is_correct')::boolean,
    greatest(coalesce((entry ->> 'points_awarded')::int, 0), 0)
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) as entry;

  return query select v_claim.id, v_claim.attempt_count, v_locked, v_attempt_incremented;
end;
$$;

revoke execute on function public.apply_verification_submission(uuid, uuid, claim_status, int, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.apply_verification_submission(uuid, uuid, claim_status, int, boolean, jsonb) to service_role;
