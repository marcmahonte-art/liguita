create or replace function public.retention_purge()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answers int := 0;
  v_messages int := 0;
begin
  delete from verification_answers where created_at < now() - interval '3 months';
  get diagnostics v_answers = row_count;
  delete from messages where created_at < now() - interval '24 months';
  get diagnostics v_messages = row_count;
  insert into audit_logs (action, target_kind, after)
  values ('retention.purge', 'retention', jsonb_build_object('verification_answers_deleted', v_answers, 'messages_deleted', v_messages));
  return jsonb_build_object('verification_answers_deleted', v_answers, 'messages_deleted', v_messages, 'at', now());
end;
$$;

revoke execute on function public.retention_purge() from public;
grant execute on function public.retention_purge() to service_role;
