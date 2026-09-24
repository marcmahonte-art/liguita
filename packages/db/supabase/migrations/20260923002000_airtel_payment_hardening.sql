alter table transactions
  add column if not exists provider_request_started_at timestamptz;

alter table payment_events
  add column if not exists airtel_status text,
  add column if not exists airtel_transaction_id text,
  add column if not exists airtel_money_id text,
  add column if not exists signature text,
  add column if not exists processed_at timestamptz,
  add column if not exists processing_status text;

create unique index if not exists transactions_one_active_per_quote_idx
  on transactions (quote_id)
  where status in ('INITIATED', 'PENDING');

create unique index if not exists transactions_airtel_money_id_unique_idx
  on transactions (airtel_money_id)
  where airtel_money_id is not null;

create table if not exists payment_enquiry_jobs (
  id                    uuid primary key default gen_random_uuid(),
  transaction_id        uuid not null references transactions(id) on delete cascade,
  attempt               int not null default 0 check (attempt >= 0 and attempt <= 15),
  next_attempt_at       timestamptz not null,
  started_at            timestamptz,
  completed_at          timestamptz,
  status                text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'UNKNOWN', 'FAILED')),
  last_error            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists payment_enquiry_jobs_transaction_idx
  on payment_enquiry_jobs (transaction_id);

create index if not exists payment_enquiry_jobs_due_idx
  on payment_enquiry_jobs (status, next_attempt_at);

alter table payment_enquiry_jobs enable row level security;
alter table payment_enquiry_jobs force row level security;

create trigger payment_enquiry_jobs_set_updated_at
  before update on payment_enquiry_jobs
  for each row execute function public.set_updated_at();

create or replace function public.create_payment_transaction(
  p_quote_id uuid,
  p_idempotency_key text,
  p_provider text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_quote public.price_quotes%rowtype;
  v_id uuid;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Cle d idempotence invalide';
  end if;

  select * into v_quote from public.price_quotes where id = p_quote_id for update;
  if v_quote.id is null or v_quote.payer_id <> v_user then raise exception 'Devis introuvable'; end if;
  if v_quote.status <> 'OPEN' or v_quote.expires_at <= now() then raise exception 'Devis expire'; end if;
  if not exists (
    select 1 from claims c where c.match_id = v_quote.match_id and c.claimant_id = v_user and c.status = 'APPROVED'
  ) then raise exception 'Verification non approuvee'; end if;

  select id into v_id
  from public.transactions
  where quote_id = v_quote.id
    and status in ('INITIATED', 'PENDING', 'PAID', 'REFUNDED')
  order by created_at desc
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.transactions (
    quote_id, payer_id, match_id, amount, currency, provider, idempotency_key,
    reward_amount, community_bonus, liguita_commission, delivery_payout, vat_amount
  ) values (
    v_quote.id, v_quote.payer_id, v_quote.match_id, v_quote.total_amount, v_quote.currency,
    p_provider, p_idempotency_key, v_quote.reward_amount, v_quote.community_bonus,
    v_quote.liguita_commission, v_quote.delivery_payout, v_quote.vat_amount
  ) on conflict (idempotency_key) do nothing returning id into v_id;

  if v_id is null then
    select id into v_id from public.transactions where idempotency_key = p_idempotency_key and payer_id = v_user;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.create_payment_transaction(uuid, text, text) from public;
grant execute on function public.create_payment_transaction(uuid, text, text) to authenticated, service_role;

create or replace function public.claim_payment_submission(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
begin
  update transactions
  set provider_request_started_at = now()
  where id = p_transaction_id
    and status in ('INITIATED', 'PENDING')
    and provider_request_started_at is null;
  v_claimed := found;
  return v_claimed;
end;
$$;

revoke execute on function public.claim_payment_submission(uuid) from public, anon;
grant execute on function public.claim_payment_submission(uuid) to authenticated, service_role;

create or replace function public.record_airtel_payment_event(
  p_transaction_id uuid,
  p_event_id text,
  p_airtel_status text,
  p_airtel_transaction_id text,
  p_airtel_money_id text,
  p_signature text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null or length(trim(p_event_id)) = 0 then
    raise exception 'Evenement Airtel invalide';
  end if;

  insert into payment_events (
    transaction_id,
    provider,
    event_id,
    event_type,
    payload,
    airtel_status,
    airtel_transaction_id,
    airtel_money_id,
    signature,
    received_at,
    processed_at,
    processing_status
  ) values (
    p_transaction_id,
    'AIRTEL',
    p_event_id,
    'CALLBACK',
    p_payload,
    p_airtel_status,
    p_airtel_transaction_id,
    p_airtel_money_id,
    p_signature,
    now(),
    now(),
    'RECEIVED'
  )
  on conflict (event_id) do nothing;

  return found;
end;
$$;

revoke execute on function public.record_airtel_payment_event(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.record_airtel_payment_event(uuid, text, text, text, text, text, jsonb) to service_role;

create or replace function public.apply_airtel_status(
  p_transaction_id uuid,
  p_airtel_status text,
  p_airtel_transaction_id text,
  p_airtel_money_id text,
  p_airtel_response_code text,
  p_event_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction transactions%rowtype;
begin
  if p_airtel_status not in ('TF', 'TA', 'TIP', 'TE') then
    raise exception 'Statut Airtel non supporte';
  end if;

  select * into v_transaction from transactions where id = p_transaction_id for update;
  if v_transaction.id is null then raise exception 'Transaction introuvable'; end if;

  if v_transaction.status in ('PAID', 'REFUNDED') then
    update transactions
    set airtel_status = p_airtel_status,
        airtel_transaction_id = p_airtel_transaction_id,
        airtel_money_id = p_airtel_money_id,
        airtel_response_code = p_airtel_response_code,
        last_error_code = p_airtel_response_code,
        callback_received_at = now()
    where id = p_transaction_id;
    return jsonb_build_object('status', v_transaction.status, 'final', true);
  end if;

  update transactions
  set status = case when p_airtel_status in ('TA', 'TIP') then 'PENDING'::payment_status else case when p_airtel_status = 'TF' then 'FAILED'::payment_status else 'CANCELLED'::payment_status end end,
      failure_reason = case when p_airtel_status in ('TA', 'TIP') then null else p_payload -> 'transaction' ->> 'message' end,
      airtel_status = p_airtel_status,
      airtel_transaction_id = p_airtel_transaction_id,
      airtel_money_id = p_airtel_money_id,
      airtel_response_code = p_airtel_response_code,
      last_error_code = p_airtel_response_code,
      callback_received_at = now()
  where id = p_transaction_id;

  return jsonb_build_object(
    'status', case when p_airtel_status in ('TA', 'TIP') then 'PENDING' else p_airtel_status end,
    'airtel_status', p_airtel_status,
    'final', p_airtel_status in ('TF', 'TE')
  );
end;
$$;

revoke execute on function public.apply_airtel_status(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.apply_airtel_status(uuid, text, text, text, text, text, jsonb) to service_role;

create or replace function public.schedule_payment_enquiry(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  insert into payment_enquiry_jobs (transaction_id, next_attempt_at, status)
  values (p_transaction_id, now() + interval '180 seconds', 'PENDING')
  on conflict (transaction_id) do update
    set status = case when payment_enquiry_jobs.status in ('COMPLETED', 'FAILED') then 'PENDING' else payment_enquiry_jobs.status end,
        next_attempt_at = case when payment_enquiry_jobs.status in ('COMPLETED', 'FAILED') then now() + interval '180 seconds' else payment_enquiry_jobs.next_attempt_at end,
        updated_at = now()
  returning id into v_job_id;
  return v_job_id;
end;
$$;

revoke execute on function public.schedule_payment_enquiry(uuid) from public, anon;
grant execute on function public.schedule_payment_enquiry(uuid) to service_role;

create or replace function public.mark_payment_paid(
  p_transaction_id uuid,
  p_provider_reference text,
  p_payload jsonb,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction public.transactions%rowtype;
  v_quote public.price_quotes%rowtype;
  v_owner_id uuid;
  v_finder_id uuid;
  v_conversation_id uuid;
  v_created boolean := false;
begin
  select * into v_transaction from public.transactions where id = p_transaction_id for update;
  if v_transaction.id is null then raise exception 'Transaction introuvable'; end if;
  if v_transaction.status = 'PAID' then
    return jsonb_build_object('status', 'PAID', 'idempotent', true);
  end if;
  if v_transaction.status = 'REFUNDED' then
    raise exception 'Transition de paiement invalide';
  end if;

  insert into public.payment_events (transaction_id, provider, event_id, event_type, payload)
  values (p_transaction_id, v_transaction.provider, p_event_id, 'PAID', p_payload)
  on conflict (event_id) do nothing;
  if not found then
    return jsonb_build_object('status', v_transaction.status, 'duplicate_event', true);
  end if;

  select * into v_quote from public.price_quotes where id = v_transaction.quote_id for update;
  if v_quote.id is null then raise exception 'Devis introuvable'; end if;

  update public.transactions
  set status = 'PAID', provider_reference = p_provider_reference, provider_payload = p_payload,
      airtel_status = coalesce(p_payload #>> '{transaction,status}', airtel_status),
      airtel_money_id = coalesce(p_payload #>> '{transaction,airtel_money_id}', airtel_money_id),
       airtel_response_code = coalesce(p_payload #>> '{transaction,status_code}', airtel_response_code),
       completed_at = now()
  where id = p_transaction_id;
  update public.price_quotes set status = 'CONSUMED', consumed_at = now() where id = v_quote.id;
  update public.payment_enquiry_jobs
  set status = 'COMPLETED', completed_at = now(), updated_at = now()
  where transaction_id = p_transaction_id and status in ('PENDING', 'PROCESSING');

  select l.user_id, f.finder_id into v_owner_id, v_finder_id
  from lost_items l join found_items f on f.id = (select found_item_id from matches where id = v_quote.match_id)
  where l.id = (select lost_item_id from matches where id = v_quote.match_id);

  insert into public.rewards (transaction_id, beneficiary_id, amount, status, reserved_at)
  values (p_transaction_id, v_finder_id, v_transaction.reward_amount + v_transaction.community_bonus, 'RESERVED', now())
  on conflict (transaction_id) do nothing;

  insert into public.ledger_entries (transaction_id, account, direction, amount, label)
  values (p_transaction_id, 'CUSTOMER', 'DEBIT', v_transaction.amount, 'Encaissement paiement');
  if v_transaction.liguita_commission - v_transaction.vat_amount > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount, label)
    values (p_transaction_id, 'LIGUITA', 'CREDIT', v_transaction.liguita_commission - v_transaction.vat_amount, 'Commission nette');
  end if;
  if v_transaction.vat_amount > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount, label)
    values (p_transaction_id, 'VAT', 'CREDIT', v_transaction.vat_amount, 'TVA');
  end if;
  if v_transaction.reward_amount + v_transaction.community_bonus > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount, label)
    values (p_transaction_id, 'FINDER', 'CREDIT', v_transaction.reward_amount + v_transaction.community_bonus, 'Recompense trouveur');
  end if;
  if v_transaction.delivery_payout > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount, label)
    values (p_transaction_id, 'PARTNER', 'CREDIT', v_transaction.delivery_payout, 'Livraison partenaire');
  end if;

  select id into v_conversation_id from public.conversations where match_id = v_quote.match_id;
  if v_conversation_id is null then
    insert into public.conversations (match_id, owner_id, finder_id, transaction_id)
    values (v_quote.match_id, v_owner_id, v_finder_id, p_transaction_id)
    returning id into v_conversation_id;
    v_created := true;
  else
    update public.conversations set transaction_id = p_transaction_id where id = v_conversation_id;
  end if;
  if v_created then
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (v_conversation_id, v_owner_id, 'Paiement confirme. Vous pouvez maintenant organiser la restitution.', true);
  end if;

  return jsonb_build_object('status', 'PAID', 'conversation_id', v_conversation_id, 'idempotent', false);
end;
$$;

revoke execute on function public.mark_payment_paid(uuid, text, jsonb, text) from public;
grant execute on function public.mark_payment_paid(uuid, text, jsonb, text) to service_role;
