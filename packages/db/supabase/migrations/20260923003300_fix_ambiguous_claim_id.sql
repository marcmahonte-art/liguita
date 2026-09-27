-- ============================================================
-- 20260923003300_fix_ambiguous_claim_id.sql
-- Correction de `column reference "claim_id" is ambiguous`
-- ============================================================
-- `apply_verification_submission` déclare `returns table (claim_id uuid, ...)`. En
-- PL/pgSQL, les colonnes de `returns table` deviennent des VARIABLES de la fonction, au
-- même titre que les paramètres `p_*`. Or le corps de la fonction contient :
--
--     delete from verification_answers where claim_id = v_claim.id;
--
-- À cet endroit, `claim_id` désigne deux choses : la variable de retour ET la colonne de
-- `verification_answers`. PostgreSQL ne tranche pas et lève
-- `column reference "claim_id" is ambiguous` — au premier appel, donc à la soumission
-- des réponses de vérification. La fonction n'a jamais pu s'exécuter.
--
-- Le correctif consiste à qualifier la référence par un alias de table. Le nom de la
-- colonne de retour n'est PAS modifié : `apps/web/src/app/actions/verification.ts` lit
-- `applied.claim_id` dans le retour du RPC, ce nom fait partie du contrat de l'API.
--
-- Aucun autre objet n'est concerné : `apply_verification_decision` déclare le même
-- `returns table` mais ne référence jamais `claim_id` dans son corps, et
-- `price_quotes_prevent_financial_mutation` n'utilise que `new.claim_id` / `old.claim_id`.
-- ============================================================

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

  -- ⚠️ `va.` est indispensable : sans l'alias, `claim_id` reste ambigu entre la variable
  -- de retour ci-dessus et la colonne de la table, et la fonction échoue.
  delete from public.verification_answers va where va.claim_id = v_claim.id;

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
