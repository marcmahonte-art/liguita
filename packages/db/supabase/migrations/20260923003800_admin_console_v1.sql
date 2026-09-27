-- =============================================================================
-- Liguita — console d'administration, volet financier
-- =============================================================================
--
-- POURQUOI CETTE MIGRATION
-- ------------------------
-- Les tables `wallet_accounts`, `wallet_entries` et `withdrawals` (migration
-- 03000) ne portaient qu'une politique `_select_own`. Conséquence directe :
-- **un administrateur ne pouvait pas voir les demandes de retrait des
-- trouveurs**, ni leur solde. Le trouveur demandait son argent, personne côté
-- Liguita ne le voyait, et rien n'existait pour faire avancer le statut.
--
-- Cette migration apporte trois choses :
--   1. la **lecture staff** du registre d'écritures et des retraits ;
--   2. le **circuit de traitement** d'un retrait (valider, refuser, payer) ;
--   3. un **tableau de bord financier** agrégé, en une seule RPC.
--
-- ⚠️ Elle ne crée aucune table : tout s'appuie sur le schéma existant.
-- ⚠️ Elle est **idempotente** : rejouable sur une base déjà à jour.
--
-- Référence : docs/Liguita_Plan_Implementation_v3.md §13 et §15.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colonnes de traitement sur `withdrawals`
-- -----------------------------------------------------------------------------
--
-- Le circuit d'un retrait demande de savoir **qui** l'a traité, **quand**, et
-- avec quelle référence opérateur. Sans ces colonnes, une validation n'est pas
-- traçable et ne peut pas être contestée.

alter table public.withdrawals
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists provider_request_payload jsonb,
  add column if not exists provider_response_payload jsonb,
  add column if not exists payout_attempts int not null default 0,
  add column if not exists last_payout_error text,
  add column if not exists released_at timestamptz;

comment on column public.withdrawals.reviewed_by is
  'Membre du staff ayant pris la décision de valider ou refuser. Null si la demande est encore en file.';
comment on column public.withdrawals.payout_attempts is
  'Nombre de tentatives de versement soumises à l''opérateur. Sert au plafonnement côté application.';

-- Un retrait en cours de versement ne doit pas pouvoir être rejoué en parallèle.
create index if not exists withdrawals_pending_payout_idx
  on public.withdrawals (status, requested_at)
  where status in ('REQUESTED', 'SUBMITTED', 'PENDING', 'MANUAL_REVIEW');

-- -----------------------------------------------------------------------------
-- 2. Lecture staff du registre d'écritures
-- -----------------------------------------------------------------------------
--
-- Règle : un **modérateur** voit (il doit pouvoir instruire une réclamation),
-- un **administrateur** agit. La séparation est portée par `is_platform_staff()`
-- et `is_platform_admin()` (migration 01500), déjà en place — on ne les redéfinit
-- pas.
--
-- Les écritures restent en lecture seule pour tout le monde : le registre est la
-- source de vérité comptable, il ne se corrige pas à la main. Une correction
-- passe par une écriture compensatoire (REVERSED), jamais par un update.

drop policy if exists wallet_accounts_select_staff on public.wallet_accounts;
create policy wallet_accounts_select_staff on public.wallet_accounts
  for select to authenticated
  using (public.is_platform_staff());

drop policy if exists wallet_entries_select_staff on public.wallet_entries;
create policy wallet_entries_select_staff on public.wallet_entries
  for select to authenticated
  using (public.is_platform_staff());

drop policy if exists withdrawals_select_staff on public.withdrawals;
create policy withdrawals_select_staff on public.withdrawals
  for select to authenticated
  using (public.is_platform_staff());

-- -----------------------------------------------------------------------------
-- 3. Journal d'audit des actions d'administration
-- -----------------------------------------------------------------------------
--
-- `audit_logs` (migration 01500) est **immuable** (triggers no-update/no-delete).
-- C'est exactement ce qu'on veut pour tracer une décision financière : on écrit
-- une ligne, elle ne bouge plus.
--
-- Les RPC ci-dessous l'alimentent systématiquement. On ne fait pas confiance à
-- l'appelant pour le faire : une action financière non journalisée serait un
-- trou dans la piste d'audit.

create or replace function public.log_admin_action(
  p_action text,
  p_target_kind text,
  p_target_id uuid,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, target_kind, target_id, before, after)
  values (
    (select auth.uid()),
    (select app_role from public.profiles where id = (select auth.uid())),
    p_action,
    p_target_kind,
    p_target_id,
    p_before,
    p_after
  );
end;
$$;

revoke execute on function public.log_admin_action(text, text, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.log_admin_action(text, text, uuid, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Circuit de traitement d'un retrait
-- -----------------------------------------------------------------------------
--
-- Le solde a déjà été débité au moment de la demande (migration 03000 :
-- `available_balance - p_amount` + écriture DEBIT/HELD). Les transitions ne
-- touchent donc plus `available_balance` — elles ne font qu'avancer le statut.
-- La seule exception est le **refus** et le **retour en échec**, qui doivent
-- rendre l'argent : c'est le rôle de `admin_release_withdrawal_hold()`.

-- 4.1 Valider une demande : elle part chez l'opérateur.
create or replace function public.admin_approve_withdrawal(
  p_withdrawal_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := (select auth.uid());
  v_withdrawal public.withdrawals%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Action reservee aux administrateurs' using errcode = 'insufficient_privilege';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Retrait introuvable' using errcode = 'no_data_found';
  end if;
  if v_withdrawal.status not in ('REQUESTED', 'MANUAL_REVIEW') then
    raise exception 'Ce retrait a deja ete traite (statut %)', v_withdrawal.status
      using errcode = 'invalid_parameter_value';
  end if;

  update public.withdrawals
  set status = 'SUBMITTED',
      reviewed_by = v_admin,
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_note, '')), ''),
      submitted_at = now(),
      updated_at = now()
  where id = p_withdrawal_id;

  perform public.log_admin_action(
    'withdrawal.approve',
    'withdrawal',
    p_withdrawal_id,
    jsonb_build_object('status', v_withdrawal.status),
    jsonb_build_object('status', 'SUBMITTED', 'amount', v_withdrawal.amount)
  );

  return jsonb_build_object('ok', true, 'status', 'SUBMITTED', 'id', p_withdrawal_id);
end;
$$;

-- 4.2 Refuser une demande : le solde bloqué retourne au trouveur.
create or replace function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := (select auth.uid());
  v_withdrawal public.withdrawals%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Action reservee aux administrateurs' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Un motif de refus est requis' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Retrait introuvable' using errcode = 'no_data_found';
  end if;
  if v_withdrawal.status not in ('REQUESTED', 'MANUAL_REVIEW', 'SUBMITTED', 'PENDING') then
    raise exception 'Ce retrait ne peut plus etre refuse (statut %)', v_withdrawal.status
      using errcode = 'invalid_parameter_value';
  end if;

  update public.withdrawals
  set status = 'RELEASED',
      reviewed_by = v_admin,
      reviewed_at = now(),
      review_note = trim(p_reason),
      failure_reason = trim(p_reason),
      completed_at = now(),
      updated_at = now()
  where id = p_withdrawal_id;

  -- Rendre l'argent : le solde avait été débité à la demande.
  update public.wallet_accounts
  set available_balance = available_balance + v_withdrawal.amount,
      updated_at = now()
  where user_id = v_withdrawal.user_id;

  insert into public.wallet_entries (
    wallet_user_id, direction, amount, status, source_type, source_id, idempotency_key
  ) values (
    v_withdrawal.user_id, 'CREDIT', v_withdrawal.amount, 'REVERSED', 'WITHDRAWAL_REVERSAL',
    p_withdrawal_id, 'withdrawal_reversal_' || p_withdrawal_id::text
  ) on conflict (idempotency_key) do nothing;

  perform public.log_admin_action(
    'withdrawal.reject',
    'withdrawal',
    p_withdrawal_id,
    jsonb_build_object('status', v_withdrawal.status),
    jsonb_build_object('status', 'RELEASED', 'reason', trim(p_reason))
  );

  return jsonb_build_object('ok', true, 'status', 'RELEASED', 'id', p_withdrawal_id);
end;
$$;

-- 4.3 Marquer un retrait payé — après encaissement effectif par le trouveur.
--
-- Deux chemins mènent ici : le webhook de l'opérateur (automatique), et le
-- règlement manuel par un administrateur (l'opérateur a payé mais son API ne
-- l'a pas signalé). Les deux écrivent la même transition, pour qu'il n'existe
-- qu'une seule définition de « payé ».
create or replace function public.admin_mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_provider_reference text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := (select auth.uid());
  v_withdrawal public.withdrawals%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Action reservee aux administrateurs' using errcode = 'insufficient_privilege';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Retrait introuvable' using errcode = 'no_data_found';
  end if;
  if v_withdrawal.status = 'PAID' then
    -- Idempotent : rejouer un webhook ne doit rien casser.
    return jsonb_build_object('ok', true, 'status', 'PAID', 'id', p_withdrawal_id, 'already', true);
  end if;
  if v_withdrawal.status in ('RELEASED', 'CANCELLED') then
    raise exception 'Ce retrait est clos (statut %)', v_withdrawal.status
      using errcode = 'invalid_parameter_value';
  end if;

  update public.withdrawals
  set status = 'PAID',
      provider_reference = coalesce(p_provider_reference, provider_reference),
      completed_at = now(),
      updated_at = now(),
      failure_reason = null,
      review_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), review_note)
  where id = p_withdrawal_id;

  -- L'écriture passe de HELD à AVAILABLE : l'argent est bien sorti, le blocage
  -- n'a plus de raison d'être.
  update public.wallet_entries
  set status = 'AVAILABLE'
  where idempotency_key = 'withdrawal_' || p_withdrawal_id::text
    and status = 'HELD';

  perform public.log_admin_action(
    'withdrawal.paid',
    'withdrawal',
    p_withdrawal_id,
    jsonb_build_object('status', v_withdrawal.status),
    jsonb_build_object('status', 'PAID', 'amount', v_withdrawal.amount, 'by', 'admin')
  );

  return jsonb_build_object('ok', true, 'status', 'PAID', 'id', p_withdrawal_id);
end;
$$;

-- 4.4 Relever le blocage — l'opérateur a échoué définitivement.
--
-- Distinction essentielle avec le refus : un **échec technique** rend l'argent
-- au trouveur (il n'a rien fait de mal), mais garde la trace de l'échec.
create or replace function public.admin_release_withdrawal_hold(
  p_withdrawal_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin uuid := (select auth.uid());
  v_withdrawal public.withdrawals%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Action reservee aux administrateurs' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Un motif est requis' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Retrait introuvable' using errcode = 'no_data_found';
  end if;
  if v_withdrawal.status in ('PAID', 'RELEASED', 'CANCELLED') then
    raise exception 'Ce retrait est deja clos (statut %)', v_withdrawal.status
      using errcode = 'invalid_parameter_value';
  end if;

  update public.withdrawals
  set status = 'FAILED',
      failure_reason = trim(p_reason),
      released_at = now(),
      completed_at = now(),
      updated_at = now()
  where id = p_withdrawal_id;

  update public.wallet_accounts
  set available_balance = available_balance + v_withdrawal.amount,
      updated_at = now()
  where user_id = v_withdrawal.user_id;

  insert into public.wallet_entries (
    wallet_user_id, direction, amount, status, source_type, source_id, idempotency_key
  ) values (
    v_withdrawal.user_id, 'CREDIT', v_withdrawal.amount, 'REVERSED', 'WITHDRAWAL_REVERSAL',
    p_withdrawal_id, 'withdrawal_reversal_' || p_withdrawal_id::text
  ) on conflict (idempotency_key) do nothing;

  perform public.log_admin_action(
    'withdrawal.release',
    'withdrawal',
    p_withdrawal_id,
    jsonb_build_object('status', v_withdrawal.status),
    jsonb_build_object('status', 'FAILED', 'reason', trim(p_reason))
  );

  return jsonb_build_object('ok', true, 'status', 'FAILED', 'id', p_withdrawal_id);
end;
$$;

-- 4.5 Enregistrer une tentative de versement (appelée par la route serveur).
create or replace function public.admin_record_payout_attempt(
  p_withdrawal_id uuid,
  p_provider_reference text,
  p_provider_status text,
  p_request_payload jsonb default null,
  p_response_payload jsonb default null,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  if not public.is_platform_staff() then
    raise exception 'Action reservee au personnel Liguita' using errcode = 'insufficient_privilege';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Retrait introuvable' using errcode = 'no_data_found';
  end if;

  update public.withdrawals
  set provider_reference = coalesce(p_provider_reference, provider_reference),
      provider_request_id = coalesce(p_provider_reference, provider_request_id),
      provider_request_payload = coalesce(p_request_payload, provider_request_payload),
      provider_response_payload = coalesce(p_response_payload, provider_response_payload),
      payout_attempts = payout_attempts + 1,
      last_payout_error = p_error,
      status = case
        when p_provider_status = 'PAID' then 'PAID'
        when p_provider_status in ('SUBMITTED', 'PENDING') then 'PENDING'
        when p_provider_status = 'FAILED' then 'MANUAL_REVIEW'
        else status
      end,
      submitted_at = coalesce(submitted_at, now()),
      completed_at = case when p_provider_status = 'PAID' then now() else completed_at end,
      updated_at = now()
  where id = p_withdrawal_id;

  return jsonb_build_object('ok', true, 'attempts', v_withdrawal.payout_attempts + 1);
end;
$$;

revoke execute on function public.admin_approve_withdrawal(uuid, text) from public, anon;
revoke execute on function public.admin_reject_withdrawal(uuid, text) from public, anon;
revoke execute on function public.admin_mark_withdrawal_paid(uuid, text, text) from public, anon;
revoke execute on function public.admin_release_withdrawal_hold(uuid, text) from public, anon;
revoke execute on function public.admin_record_payout_attempt(uuid, text, text, jsonb, jsonb, text) from public, anon;

grant execute on function public.admin_approve_withdrawal(uuid, text) to authenticated, service_role;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated, service_role;
grant execute on function public.admin_mark_withdrawal_paid(uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_release_withdrawal_hold(uuid, text) to authenticated, service_role;
grant execute on function public.admin_record_payout_attempt(uuid, text, text, jsonb, jsonb, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Tableau de bord financier
-- -----------------------------------------------------------------------------
--
-- Une seule RPC plutôt que sept requêtes côté application. Deux raisons :
--   · les agrégats sont cohérents entre eux (même instantané) ;
--   · le coût d'un aller-retour réseau, pas de sept.
--
-- ⚠️ Réservée au staff : elle expose des volumes financiers consolidés.

create or replace function public.admin_finance_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_staff() then
    raise exception 'Action reservee au personnel Liguita' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'deposits', jsonb_build_object(
      'paid_count', (select count(*) from public.transactions where status = 'PAID'),
      'paid_amount', coalesce((select sum(amount) from public.transactions where status = 'PAID'), 0),
      'pending_count', (select count(*) from public.transactions where status in ('INITIATED', 'PENDING')),
      'pending_amount', coalesce((select sum(amount) from public.transactions where status in ('INITIATED', 'PENDING')), 0),
      'failed_count', (select count(*) from public.transactions where status in ('FAILED', 'CANCELLED')),
      'refunded_amount', coalesce((select sum(refund_amount) from public.transactions where refund_amount > 0), 0),
      -- ⚠️ `transactions` ne porte pas de colonne `paid_at` : `completed_at`
      -- n'est renseigné que par certains chemins. La date fiable d'un
      -- encaissement est donc celle de l'événement de paiement, et on retombe
      -- sur `initiated_at` si l'événement manque (paiement de test, reprise).
      'today_count', (select count(*) from public.transactions
                       where status = 'PAID'
                         and coalesce(callback_received_at, completed_at, initiated_at) >= date_trunc('day', now())),
      'today_amount', coalesce((select sum(amount) from public.transactions
                       where status = 'PAID'
                         and coalesce(callback_received_at, completed_at, initiated_at) >= date_trunc('day', now())), 0)
    ),
    'commissions', jsonb_build_object(
      'total_commission', coalesce((select sum(liguita_commission) from public.transactions where status = 'PAID'), 0),
      'total_vat', coalesce((select sum(vat_amount) from public.transactions where status = 'PAID'), 0),
      'total_rewards', coalesce((select sum(reward_amount) from public.transactions where status = 'PAID'), 0),
      'total_bonus', coalesce((select sum(community_bonus) from public.transactions where status = 'PAID'), 0),
      'total_delivery', coalesce((select sum(delivery_payout) from public.transactions where status = 'PAID'), 0)
    ),
    'withdrawals', jsonb_build_object(
      'requested_count', (select count(*) from public.withdrawals where status = 'REQUESTED'),
      'requested_amount', coalesce((select sum(amount) from public.withdrawals where status = 'REQUESTED'), 0),
      'in_flight_count', (select count(*) from public.withdrawals where status in ('SUBMITTED', 'PENDING')),
      'in_flight_amount', coalesce((select sum(amount) from public.withdrawals where status in ('SUBMITTED', 'PENDING')), 0),
      'manual_review_count', (select count(*) from public.withdrawals where status = 'MANUAL_REVIEW'),
      'paid_count', (select count(*) from public.withdrawals where status = 'PAID'),
      'paid_amount', coalesce((select sum(amount) from public.withdrawals where status = 'PAID'), 0),
      'failed_count', (select count(*) from public.withdrawals where status in ('FAILED', 'RELEASED', 'CANCELLED')),
      'overdue_count', (select count(*) from public.withdrawals
                         where status in ('REQUESTED', 'MANUAL_REVIEW') and sla_due_at < now()),
      'oldest_waiting_at', (select min(requested_at) from public.withdrawals where status in ('REQUESTED', 'MANUAL_REVIEW'))
    ),
    'wallets', jsonb_build_object(
      'account_count', (select count(*) from public.wallet_accounts),
      'available_total', coalesce((select sum(available_balance) from public.wallet_accounts), 0),
      'pending_total', coalesce((select sum(pending_balance) from public.wallet_accounts), 0),
      'reserved_entries', coalesce((select sum(amount) from public.wallet_entries where status = 'RESERVED'), 0),
      'held_entries', coalesce((select sum(amount) from public.wallet_entries where status = 'HELD'), 0)
    ),
    'payment_health', jsonb_build_object(
      'events_24h', (select count(*) from public.payment_events where received_at >= now() - interval '24 hours'),
      'events_unprocessed', (select count(*) from public.payment_events where processed_at is null),
      'enquiry_pending', (select count(*) from public.payment_enquiry_jobs where status = 'PENDING'),
      'enquiry_unknown', (select count(*) from public.payment_enquiry_jobs where status = 'UNKNOWN')
    ),
    'at', now()
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_finance_overview() from public, anon;
grant execute on function public.admin_finance_overview() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. Le personnel peut relancer un rapprochement depuis la console
-- -----------------------------------------------------------------------------
--
-- La route cron fait tourner les jobs ; depuis l'interface, un administrateur
-- doit pouvoir en déclencher un sans attendre le prochain passage.

create or replace function public.admin_requeue_enquiry(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.payment_enquiry_jobs%rowtype;
begin
  if not public.is_platform_staff() then
    raise exception 'Action reservee au personnel Liguita' using errcode = 'insufficient_privilege';
  end if;

  select * into v_job from public.payment_enquiry_jobs
  where transaction_id = p_transaction_id for update;

  if v_job.id is null then
    raise exception 'Aucun rapprochement pour cette transaction' using errcode = 'no_data_found';
  end if;

  update public.payment_enquiry_jobs
  set status = 'PENDING',
      attempt = 0,
      next_attempt_at = now(),
      started_at = null,
      completed_at = null,
      last_error = 'Relance manuelle depuis la console',
      updated_at = now()
  where id = v_job.id;

  perform public.log_admin_action(
    'payment.requeue',
    'transaction',
    p_transaction_id,
    jsonb_build_object('status', v_job.status, 'attempt', v_job.attempt),
    jsonb_build_object('status', 'PENDING', 'attempt', 0)
  );

  return jsonb_build_object('ok', true, 'job_id', v_job.id);
end;
$$;

revoke execute on function public.admin_requeue_enquiry(uuid) from public, anon;
grant execute on function public.admin_requeue_enquiry(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Rechargement du cache de schéma PostgREST
-- -----------------------------------------------------------------------------
-- Sans cette notification, les nouvelles RPC ne sont pas exposées avant plusieurs
-- minutes, et l'application reçoit « function not found » alors que la migration
-- s'est bien appliquée.

notify pgrst, 'reload schema';
