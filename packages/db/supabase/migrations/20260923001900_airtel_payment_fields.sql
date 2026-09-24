alter table transactions
  add column if not exists airtel_money_id text,
  add column if not exists airtel_status text,
  add column if not exists airtel_response_code text,
  add column if not exists retry_count int not null default 0 check (retry_count >= 0),
  add column if not exists last_error_code text,
  add column if not exists callback_received_at timestamptz,
  add column if not exists captured_at timestamptz;

create index if not exists transactions_airtel_money_id_idx
  on transactions (airtel_money_id)
  where airtel_money_id is not null;

create index if not exists transactions_airtel_status_idx
  on transactions (airtel_status, initiated_at)
  where airtel_status is not null;
