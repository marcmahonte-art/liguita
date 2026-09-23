create table price_quotes (
  id                    uuid primary key default gen_random_uuid(),
  public_ref            text not null unique default ('Q-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  claim_id              uuid references claims(id),
  match_id              uuid not null references matches(id) on delete cascade,
  payer_id              uuid not null references profiles(id),
  pricing_rule_id       uuid not null references pricing_rules(id),
  pricing_rule_version  int not null,
  pricing_class         pricing_class not null,
  declared_value_xaf    bigint,
  base_fee              int not null check (base_fee > 0),
  urgent_fee            int not null default 0 check (urgent_fee >= 0),
  conciergerie_fee      int not null default 0 check (conciergerie_fee >= 0),
  delivery_fee          int not null default 0 check (delivery_fee >= 0),
  community_bonus       int not null default 0 check (community_bonus >= 0),
  total_amount          int not null check (total_amount > 0),
  currency              char(3) not null default 'XAF',
  reward_amount         int not null check (reward_amount > 0),
  liguita_commission    int not null check (liguita_commission >= 0),
  delivery_payout       int not null default 0 check (delivery_payout >= 0),
  vat_amount            int not null default 0 check (vat_amount >= 0),
  options               pricing_option[] not null default '{}',
  breakdown             jsonb not null,
  status                text not null default 'OPEN' check (status in ('OPEN', 'CONSUMED', 'EXPIRED', 'VOID')),
  expires_at            timestamptz not null,
  created_at            timestamptz not null default now(),
  consumed_at           timestamptz,
  constraint price_quotes_breakdown_balance check (
    reward_amount + community_bonus + liguita_commission + delivery_payout = total_amount
  )
);

create index price_quotes_payer_idx on price_quotes (payer_id, created_at desc);
create index price_quotes_match_idx on price_quotes (match_id, status, created_at desc);

create or replace function public.price_quotes_prevent_financial_mutation()
returns trigger
language plpgsql
as $$
begin
  if new.claim_id is distinct from old.claim_id
    or new.match_id is distinct from old.match_id
    or new.payer_id is distinct from old.payer_id
    or new.pricing_rule_id is distinct from old.pricing_rule_id
    or new.pricing_rule_version is distinct from old.pricing_rule_version
    or new.pricing_class is distinct from old.pricing_class
    or new.declared_value_xaf is distinct from old.declared_value_xaf
    or new.base_fee is distinct from old.base_fee
    or new.urgent_fee is distinct from old.urgent_fee
    or new.conciergerie_fee is distinct from old.conciergerie_fee
    or new.delivery_fee is distinct from old.delivery_fee
    or new.community_bonus is distinct from old.community_bonus
    or new.total_amount is distinct from old.total_amount
    or new.currency is distinct from old.currency
    or new.reward_amount is distinct from old.reward_amount
    or new.liguita_commission is distinct from old.liguita_commission
    or new.delivery_payout is distinct from old.delivery_payout
    or new.vat_amount is distinct from old.vat_amount
    or new.options is distinct from old.options
    or new.breakdown is distinct from old.breakdown
  then
    raise exception 'Un devis deja emis ne peut pas etre modifie.' using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger price_quotes_immutable
  before update on price_quotes
  for each row execute function public.price_quotes_prevent_financial_mutation();

create table transactions (
  id                   uuid primary key default gen_random_uuid(),
  public_ref           text not null unique default ('T-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  quote_id             uuid not null references price_quotes(id),
  payer_id             uuid not null references profiles(id),
  match_id             uuid not null references matches(id),
  amount               int not null check (amount > 0),
  currency             char(3) not null default 'XAF',
  provider             text not null,
  provider_reference   text,
  provider_payload     jsonb,
  status               payment_status not null default 'INITIATED',
  failure_reason       text,
  idempotency_key      text not null unique,
  initiated_at         timestamptz not null default now(),
  completed_at         timestamptz,
  refunded_at          timestamptz,
  refund_amount        int not null default 0 check (refund_amount >= 0),
  reward_amount        int not null check (reward_amount > 0),
  community_bonus      int not null default 0 check (community_bonus >= 0),
  liguita_commission   int not null check (liguita_commission >= 0),
  delivery_payout      int not null default 0 check (delivery_payout >= 0),
  vat_amount           int not null default 0 check (vat_amount >= 0),
  created_at           timestamptz not null default now()
);

create unique index transactions_provider_reference_idx on transactions (provider, provider_reference)
  where provider_reference is not null;
create index transactions_payer_idx on transactions (payer_id, created_at desc);
create index transactions_match_idx on transactions (match_id, created_at desc);
create index transactions_status_idx on transactions (status, created_at);

create table rewards (
  id                uuid primary key default gen_random_uuid(),
  transaction_id    uuid not null unique references transactions(id) on delete cascade,
  beneficiary_id    uuid not null references profiles(id),
  amount            int not null check (amount > 0),
  currency          char(3) not null default 'XAF',
  status            reward_status not null default 'PENDING',
  mode              text not null default 'STANDARD' check (mode in ('STANDARD', 'SOLIDARITY', 'CREDIT')),
  payout_provider   text,
  payout_reference  text,
  reserved_at       timestamptz,
  released_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index rewards_beneficiary_idx on rewards (beneficiary_id, created_at desc);

create table ledger_entries (
  id              bigserial primary key,
  transaction_id  uuid not null references transactions(id) on delete cascade,
  account         text not null,
  direction       text not null check (direction in ('DEBIT', 'CREDIT')),
  amount          int not null check (amount > 0),
  currency        char(3) not null default 'XAF',
  label           text not null,
  created_at      timestamptz not null default now()
);

create index ledger_entries_transaction_idx on ledger_entries (transaction_id, created_at);
create index ledger_entries_account_idx on ledger_entries (account, created_at desc);

create or replace function public.ledger_entries_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Les ecritures comptables sont immuables.' using errcode = 'restrict_violation';
end;
$$;

create trigger ledger_entries_no_update
  before update on ledger_entries
  for each row execute function public.ledger_entries_append_only();
create trigger ledger_entries_no_delete
  before delete on ledger_entries
  for each row execute function public.ledger_entries_append_only();

create table payment_events (
  id                 uuid primary key default gen_random_uuid(),
  transaction_id     uuid not null references transactions(id) on delete cascade,
  provider           text not null,
  event_id           text not null unique,
  event_type         text not null,
  payload            jsonb not null,
  received_at        timestamptz not null default now()
);

create table refunds (
  id                uuid primary key default gen_random_uuid(),
  transaction_id    uuid not null references transactions(id),
  amount            int not null check (amount > 0),
  reason            text not null,
  status            text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  provider_reference text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index refunds_pending_idx on refunds (status, created_at) where status in ('PENDING', 'PROCESSING');

alter table price_quotes enable row level security;
alter table price_quotes force row level security;
alter table transactions enable row level security;
alter table transactions force row level security;
alter table rewards enable row level security;
alter table rewards force row level security;
alter table ledger_entries enable row level security;
alter table ledger_entries force row level security;
alter table payment_events enable row level security;
alter table payment_events force row level security;
alter table refunds enable row level security;
alter table refunds force row level security;

grant select on price_quotes to authenticated;
grant select on transactions to authenticated;
grant select on rewards to authenticated;
grant select on ledger_entries to authenticated;
grant select on refunds to authenticated;

create policy price_quotes_select_own on price_quotes
  for select to authenticated using (payer_id = (select auth.uid()));
create policy transactions_select_own on transactions
  for select to authenticated using (payer_id = (select auth.uid()));
create policy rewards_select_own on rewards
  for select to authenticated using (beneficiary_id = (select auth.uid()));
create policy ledger_entries_select_transaction_owner on ledger_entries
  for select to authenticated using (
    exists (select 1 from transactions t where t.id = transaction_id and t.payer_id = (select auth.uid()))
  );
create policy refunds_select_transaction_owner on refunds
  for select to authenticated using (
    exists (select 1 from transactions t where t.id = transaction_id and t.payer_id = (select auth.uid()))
  );

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
  v_event_id uuid;
begin
  select * into v_transaction from public.transactions where id = p_transaction_id for update;
  if v_transaction.id is null then raise exception 'Transaction introuvable'; end if;
  if v_transaction.status = 'PAID' then
    return jsonb_build_object('status', 'PAID', 'idempotent', true);
  end if;
  if v_transaction.status not in ('INITIATED', 'PENDING') then
    raise exception 'Transition de paiement invalide';
  end if;

  insert into public.payment_events (transaction_id, provider, event_id, event_type, payload)
  values (p_transaction_id, v_transaction.provider, p_event_id, 'PAID', p_payload)
  on conflict (event_id) do nothing;
  if not found then
    return jsonb_build_object('status', v_transaction.status, 'duplicate_event', true);
  end if;

  select * into v_quote from public.price_quotes where id = v_transaction.quote_id for update;
  if v_quote.status <> 'OPEN' or v_quote.expires_at <= now() then raise exception 'Devis non payable'; end if;

  update public.transactions
  set status = 'PAID', provider_reference = p_provider_reference, provider_payload = p_payload,
      completed_at = now()
  where id = p_transaction_id;
  update public.price_quotes set status = 'CONSUMED', consumed_at = now() where id = v_quote.id;

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

revoke execute on function public.create_conversation_for_match(uuid) from authenticated;
