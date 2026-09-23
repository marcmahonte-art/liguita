revoke update on table profiles from authenticated;
grant update (full_name, display_name, avatar_url, locale, city_slug) on profiles to authenticated;

alter table audit_logs add column if not exists actor_role app_role;
alter table audit_logs add column if not exists ip inet;
alter table audit_logs add column if not exists user_agent text;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = (select auth.uid())
      and p.app_role in ('MODERATOR', 'ADMIN')
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = (select auth.uid())
      and p.app_role = 'ADMIN'
  );
$$;

create or replace function public.audit_logs_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Les journaux d audit sont immuables.' using errcode = 'restrict_violation';
end;
$$;

create trigger audit_logs_no_update before update on audit_logs for each row execute function public.audit_logs_append_only();
create trigger audit_logs_no_delete before delete on audit_logs for each row execute function public.audit_logs_append_only();

create table data_access_logs (
  id              bigserial primary key,
  actor_id        uuid references profiles(id) on delete set null,
  actor_role      app_role,
  data_kind       text not null,
  resource_type   text not null,
  resource_id     uuid,
  purpose         text,
  fields_accessed text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create index data_access_logs_actor_idx on data_access_logs (actor_id, created_at desc);
create index data_access_logs_resource_idx on data_access_logs (resource_type, resource_id, created_at desc);

create or replace function public.data_access_logs_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Les journaux d acces sont immuables.' using errcode = 'restrict_violation';
end;
$$;

create trigger data_access_logs_no_update before update on data_access_logs for each row execute function public.data_access_logs_append_only();
create trigger data_access_logs_no_delete before delete on data_access_logs for each row execute function public.data_access_logs_append_only();

create table reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references profiles(id) on delete cascade,
  target_user_id    uuid references profiles(id) on delete set null,
  target_item_id    uuid references found_items(id) on delete set null,
  target_message_id uuid references messages(id) on delete set null,
  target_transaction_id uuid references transactions(id) on delete set null,
  reason            report_reason not null,
  details           text not null check (char_length(trim(details)) between 5 and 2000),
  status            text not null default 'OPEN' check (status in ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  assigned_to       uuid references profiles(id) on delete set null,
  resolution        text,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  closed_at         timestamptz
);

create index reports_status_idx on reports (status, created_at desc);
create index reports_target_idx on reports (target_user_id, target_item_id, target_transaction_id);

alter table data_access_logs enable row level security;
alter table data_access_logs force row level security;
alter table reports enable row level security;
alter table reports force row level security;

grant select on audit_logs to authenticated;
grant select on data_access_logs to authenticated;
grant select, insert on reports to authenticated;

create policy audit_logs_select_admin on audit_logs
  for select to authenticated using (public.is_platform_admin());
create policy data_access_logs_select_admin on data_access_logs
  for select to authenticated using (public.is_platform_admin());
create policy reports_select_own_or_staff on reports
  for select to authenticated using (reporter_id = (select auth.uid()) or public.is_platform_staff());
create policy reports_insert_own on reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_update_staff on reports
  for update to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

alter table transactions add column if not exists refund_idempotency_key text;
alter table refunds add column if not exists idempotency_key text unique;
create unique index refunds_idempotency_idx on refunds (idempotency_key) where idempotency_key is not null;

create or replace function public.create_refund(
  p_transaction_id uuid,
  p_amount int,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction public.transactions%rowtype;
  v_refund_id uuid;
  v_remaining int;
begin
  if p_amount <= 0 or length(trim(p_reason)) < 5 then raise exception 'Remboursement invalide'; end if;
  select * into v_transaction from public.transactions where id = p_transaction_id for update;
  if v_transaction.id is null or v_transaction.status not in ('PAID', 'PARTIALLY_REFUNDED') then raise exception 'Transaction non remboursable'; end if;
  if p_amount > v_transaction.amount - v_transaction.refund_amount then raise exception 'Montant trop eleve'; end if;
  insert into refunds (transaction_id, amount, reason, status, idempotency_key)
  values (p_transaction_id, p_amount, trim(p_reason), 'COMPLETED', p_idempotency_key)
  on conflict (idempotency_key) do nothing returning id into v_refund_id;
  if v_refund_id is null then
    select id into v_refund_id from refunds where idempotency_key = p_idempotency_key;
    return v_refund_id;
  end if;
  v_remaining := v_transaction.amount - v_transaction.refund_amount - p_amount;
  update transactions set refund_amount = refund_amount + p_amount,
    refunded_at = case when v_remaining = 0 then now() else refunded_at end,
    status = case when v_remaining = 0 then 'REFUNDED' else 'PARTIALLY_REFUNDED' end
  where id = p_transaction_id;
  insert into ledger_entries (transaction_id, account, direction, amount, label)
  values (p_transaction_id, 'CUSTOMER', 'CREDIT', p_amount, 'Remboursement client');
  insert into ledger_entries (transaction_id, account, direction, amount, label)
  values (p_transaction_id, 'REFUND_CLEARING', 'DEBIT', p_amount, 'Ecriture compensatoire remboursement');
  insert into audit_logs (actor_id, actor_role, action, target_kind, target_id, after)
  values ((select auth.uid()), (select app_role from profiles where id = (select auth.uid())), 'payment.refund', 'transaction', p_transaction_id, jsonb_build_object('refund_id', v_refund_id, 'amount', p_amount, 'reason', trim(p_reason)));
  return v_refund_id;
end;
$$;

revoke execute on function public.create_refund(uuid, int, text, text) from public;
grant execute on function public.create_refund(uuid, int, text, text) to service_role;

create or replace function public.publish_pricing_rule(
  p_country_code char(2),
  p_currency char(3),
  p_fees jsonb,
  p_rewards jsonb,
  p_c5 jsonb,
  p_options jsonb,
  p_tax jsonb,
  p_thresholds jsonb,
  p_value_bands jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.pricing_rules%rowtype;
  v_new_id uuid;
  v_version int;
begin
  select * into v_old from pricing_rules where country_code = p_country_code and is_active for update;
  select coalesce(max(version), 0) + 1 into v_version from pricing_rules where country_code = p_country_code;
  update pricing_rules set is_active = false, effective_to = now() where id = v_old.id;
  insert into pricing_rules (
    country_code, currency, version, is_active,
    fee_c1, fee_c2, fee_c3, fee_c4,
    fee_c5_rate, fee_c5_floor, fee_c5_ceiling,
    reward_c1, reward_c2, reward_c3, reward_c4, reward_c5_rate,
    urgent_rate, conciergerie_fee, delivery_fee, delivery_is_proxy,
    vat_rate, commission_is_ht, class_upgrade_thresholds, value_bands, created_by
  ) values (
    p_country_code, p_currency, v_version, true,
    (p_fees->>'C1')::int, (p_fees->>'C2')::int, (p_fees->>'C3')::int, (p_fees->>'C4')::int,
    (p_c5->>'rate')::numeric, (p_c5->>'floor')::int, (p_c5->>'ceiling')::int,
    (p_rewards->>'C1')::int, (p_rewards->>'C2')::int, (p_rewards->>'C3')::int, (p_rewards->>'C4')::int, (p_c5->>'rewardRate')::numeric,
    (p_options->>'urgentRate')::numeric, (p_options->>'conciergerieFee')::int, (p_options->>'deliveryFee')::int, coalesce((p_options->>'deliveryIsProxy')::boolean, false),
    (p_tax->>'vatRate')::numeric, coalesce((p_tax->>'commissionIsHt')::boolean, true), p_thresholds, p_value_bands, (select auth.uid())
  ) returning id into v_new_id;
  insert into audit_logs (actor_id, actor_role, action, target_kind, target_id, after)
  values ((select auth.uid()), 'ADMIN', 'pricing_rule.publish', 'pricing_rule', v_new_id, jsonb_build_object('version', v_version));
  return v_new_id;
end;
$$;

revoke execute on function public.publish_pricing_rule(char, char, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.publish_pricing_rule(char, char, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;
