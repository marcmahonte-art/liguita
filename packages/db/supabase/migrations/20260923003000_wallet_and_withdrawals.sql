create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  currency text not null default 'XAF',
  available_balance integer not null default 0 check (available_balance >= 0),
  pending_balance integer not null default 0 check (pending_balance >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'FROZEN', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_user_id uuid not null references public.wallet_accounts(user_id) on delete cascade,
  direction text not null check (direction in ('CREDIT', 'DEBIT')),
  amount integer not null check (amount > 0),
  status text not null check (status in ('RESERVED', 'AVAILABLE', 'HELD', 'RELEASED', 'REVERSED')),
  source_type text not null,
  source_id uuid,
  idempotency_key text not null unique,
  available_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wallet_accounts(user_id) on delete cascade,
  provider text not null default 'AIRTEL' check (provider in ('AIRTEL')),
  amount integer not null check (amount >= 2500),
  currency text not null default 'XAF',
  destination_msisdn text not null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'SUBMITTED', 'PENDING', 'PAID', 'FAILED', 'RELEASED', 'MANUAL_REVIEW', 'CANCELLED')),
  idempotency_key text not null,
  provider_request_id text,
  provider_reference text,
  requested_at timestamptz not null default now(),
  sla_due_at timestamptz not null,
  submitted_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  unique (provider, provider_reference)
);

create index if not exists wallet_entries_user_created_idx on public.wallet_entries(wallet_user_id, created_at desc);
create index if not exists withdrawals_user_created_idx on public.withdrawals(user_id, created_at desc);
create index if not exists withdrawals_sla_idx on public.withdrawals(status, sla_due_at);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_accounts force row level security;
alter table public.wallet_entries enable row level security;
alter table public.wallet_entries force row level security;
alter table public.withdrawals enable row level security;
alter table public.withdrawals force row level security;

grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_entries to authenticated;
grant select on public.withdrawals to authenticated;

create policy wallet_accounts_select_own on public.wallet_accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy wallet_entries_select_own on public.wallet_entries
  for select to authenticated using (wallet_user_id = (select auth.uid()));
create policy withdrawals_select_own on public.withdrawals
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.credit_reserved_reward()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.wallet_accounts (user_id) values (new.beneficiary_id) on conflict (user_id) do nothing;
  update public.wallet_accounts
  set pending_balance = pending_balance + new.amount, updated_at = now()
  where user_id = new.beneficiary_id;
  insert into public.wallet_entries (
    wallet_user_id, direction, amount, status, source_type, source_id, idempotency_key
  ) values (
    new.beneficiary_id, 'CREDIT', new.amount, 'RESERVED', 'REWARD', new.id, 'reward_reserved_' || new.id::text
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

drop trigger if exists rewards_credit_wallet on public.rewards;
create trigger rewards_credit_wallet
after insert on public.rewards
for each row execute function public.credit_reserved_reward();

create or replace function public.release_reward_after_return()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_reward public.rewards%rowtype;
begin
  if new.status <> 'RETURNED' or old.status = 'RETURNED' then
    return new;
  end if;

  select r.* into v_reward
  from public.rewards r
  join public.transactions t on t.id = r.transaction_id
  where t.match_id = new.match_id
    and r.status = 'RESERVED'
  order by r.created_at
  limit 1
  for update of r;

  if v_reward.id is null then
    return new;
  end if;

  update public.rewards
  set status = 'RELEASED', released_at = now(), mode = 'CREDIT'
  where id = v_reward.id and status = 'RESERVED';

  update public.wallet_accounts
  set pending_balance = greatest(pending_balance - v_reward.amount, 0),
      available_balance = available_balance + v_reward.amount,
      updated_at = now()
  where user_id = v_reward.beneficiary_id;

  insert into public.wallet_entries (
    wallet_user_id, direction, amount, status, source_type, source_id, idempotency_key, available_at
  ) values (
    v_reward.beneficiary_id, 'CREDIT', v_reward.amount, 'AVAILABLE', 'REWARD_RELEASE', v_reward.id,
    'reward_release_' || v_reward.id::text, now()
  ) on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists conversations_release_reward on public.conversations;
create trigger conversations_release_reward
after update of status on public.conversations
for each row execute function public.release_reward_after_return();

insert into public.wallet_accounts (user_id)
select distinct beneficiary_id from public.rewards
on conflict (user_id) do nothing;

insert into public.wallet_entries (
  wallet_user_id, direction, amount, status, source_type, source_id, idempotency_key
)
select r.beneficiary_id, 'CREDIT', r.amount, 'RESERVED', 'REWARD', r.id, 'reward_reserved_' || r.id::text
from public.rewards r
on conflict (idempotency_key) do nothing;

insert into public.wallet_accounts (user_id)
select u.id from public.profiles u
on conflict (user_id) do nothing;

create or replace function public.request_wallet_withdrawal(
  p_amount integer,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_account public.wallet_accounts%rowtype;
  v_destination text;
  v_withdrawal_id uuid;
  v_due timestamptz;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  if p_amount is null or p_amount < 2500 then raise exception 'Le minimum de retrait est de 2500 XAF.'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'Clé de retrait invalide.'; end if;

  select airtel_number into v_destination from public.profiles where id = v_user;
  if v_destination is null or trim(v_destination) = '' then raise exception 'Numéro Airtel Money non configuré.'; end if;

  insert into public.wallet_accounts (user_id) values (v_user) on conflict (user_id) do nothing;
  select * into v_account from public.wallet_accounts where user_id = v_user for update;
  if v_account.available_balance < p_amount then raise exception 'Solde disponible insuffisant.'; end if;

  select id into v_withdrawal_id from public.withdrawals where user_id = v_user and idempotency_key = p_idempotency_key;
  if v_withdrawal_id is not null then return v_withdrawal_id; end if;

  v_due := case extract(isodow from now())
    when 5 then date_trunc('day', now()) + interval '3 days'
    when 6 then date_trunc('day', now()) + interval '2 days'
    else date_trunc('day', now()) + interval '1 day'
  end + interval '23 hours 59 minutes';

  insert into public.withdrawals (
    user_id, amount, destination_msisdn, idempotency_key, sla_due_at
  ) values (
    v_user, p_amount, v_destination, p_idempotency_key, v_due
  ) returning id into v_withdrawal_id;

  update public.wallet_accounts
  set available_balance = available_balance - p_amount, updated_at = now()
  where user_id = v_user;

  insert into public.wallet_entries (
    wallet_user_id, direction, amount, status, source_type, source_id, idempotency_key
  ) values (
    v_user, 'DEBIT', p_amount, 'HELD', 'WITHDRAWAL', v_withdrawal_id, 'withdrawal_' || v_withdrawal_id::text
  );

  return v_withdrawal_id;
end;
$$;

revoke execute on function public.request_wallet_withdrawal(integer, text) from public, anon;
grant execute on function public.request_wallet_withdrawal(integer, text) to authenticated;
