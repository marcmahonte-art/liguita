create table conversations (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null unique references matches(id) on delete cascade,
  owner_id            uuid not null references profiles(id),
  finder_id           uuid not null references profiles(id),
  transaction_id      uuid,
  status              text not null default 'OPEN' check (status in ('OPEN', 'RETURN_PENDING', 'RETURNED', 'CLOSED', 'DISPUTED')),
  return_place        text,
  return_scheduled_at timestamptz,
  returned_at         timestamptz,
  owner_confirmed_at  timestamptz,
  finder_confirmed_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index conversations_owner_idx on conversations (owner_id, updated_at desc);
create index conversations_finder_idx on conversations (finder_id, updated_at desc);
create index conversations_status_idx on conversations (status, updated_at desc);

create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function public.set_updated_at();

alter table conversations enable row level security;
alter table conversations force row level security;

grant select on conversations to authenticated;
grant update (return_place, return_scheduled_at) on conversations to authenticated;

create policy conversations_select_parties on conversations
  for select to authenticated
  using (owner_id = (select auth.uid()) or finder_id = (select auth.uid()));

create policy conversations_update_parties on conversations
  for update to authenticated
  using (owner_id = (select auth.uid()) or finder_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) or finder_id = (select auth.uid()));

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text not null check (char_length(trim(body)) between 1 and 2000),
  attachment_path text,
  is_system       boolean not null default false,
  flagged         boolean not null default false,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at, id);
create index messages_flagged_idx on messages (flagged, created_at desc) where flagged;

alter table messages enable row level security;
alter table messages force row level security;

grant select on messages to authenticated;
grant update (read_at) on messages to authenticated;

create policy messages_select_parties on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.owner_id = (select auth.uid()) or c.finder_id = (select auth.uid()))
    )
  );

create policy messages_update_parties on messages
  for update to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.owner_id = (select auth.uid()) or c.finder_id = (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.owner_id = (select auth.uid()) or c.finder_id = (select auth.uid()))
    )
  );

create or replace function public.create_conversation_for_match(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_owner_id uuid;
  v_finder_id uuid;
begin
  select l.user_id, f.finder_id into v_owner_id, v_finder_id
  from public.matches m
  join public.lost_items l on l.id = m.lost_item_id
  join public.found_items f on f.id = m.found_item_id
  where m.id = p_match_id
    and m.status = 'CLAIMED'
    and (l.user_id = (select auth.uid()) or f.finder_id = (select auth.uid()));

  if v_owner_id is null or v_finder_id is null then
    raise exception 'Conversation non disponible';
  end if;

  insert into public.conversations (match_id, owner_id, finder_id)
  values (p_match_id, v_owner_id, v_finder_id)
  on conflict (match_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.conversations where match_id = p_match_id;
  else
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (v_id, v_owner_id, 'Dossier de mise en relation ouvert. Organisez la restitution avec l''autre partie.', true);
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_conversation_for_match(uuid) from public;
grant execute on function public.create_conversation_for_match(uuid) to authenticated;

create or replace function public.confirm_return(
  p_conversation_id uuid,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations%rowtype;
  v_actor uuid := (select auth.uid());
  v_actor_side text;
  v_completed boolean := false;
begin
  if p_side not in ('OWNER', 'FINDER') then
    raise exception 'Rôle de confirmation invalide';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id
  for update;

  if v_conversation.id is null then
    raise exception 'Conversation introuvable';
  end if;

  if v_conversation.owner_id = v_actor then
    v_actor_side := 'OWNER';
  elsif v_conversation.finder_id = v_actor then
    v_actor_side := 'FINDER';
  else
    raise exception 'Accès refusé';
  end if;

  if v_conversation.status in ('RETURNED', 'CLOSED', 'DISPUTED') then
    return jsonb_build_object('status', v_conversation.status, 'completed', v_conversation.status = 'RETURNED');
  end if;

  if v_actor_side <> p_side then
    raise exception 'Confirmation impossible pour ce rôle';
  end if;

  if (v_actor_side = 'OWNER' and v_conversation.owner_confirmed_at is not null)
    or (v_actor_side = 'FINDER' and v_conversation.finder_confirmed_at is not null) then
    raise exception 'Confirmation déjà effectuée';
  end if;

  if v_actor_side = 'OWNER' then
    update public.conversations
    set owner_confirmed_at = coalesce(owner_confirmed_at, now()),
        status = case when finder_confirmed_at is not null then 'RETURNED' else 'RETURN_PENDING' end,
        returned_at = case when finder_confirmed_at is not null then now() else returned_at end
    where id = p_conversation_id
    returning * into v_conversation;
  else
    update public.conversations
    set finder_confirmed_at = coalesce(finder_confirmed_at, now()),
        status = case when owner_confirmed_at is not null then 'RETURNED' else 'RETURN_PENDING' end,
        returned_at = case when owner_confirmed_at is not null then now() else returned_at end
    where id = p_conversation_id
    returning * into v_conversation;
  end if;

  v_completed := v_conversation.status = 'RETURNED';
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (
    p_conversation_id,
    v_conversation.owner_id,
    case
      when v_completed then 'Restitution confirmée par les deux parties. Le versement sera traité séparément.'
      when v_actor_side = 'OWNER' then 'Le propriétaire a confirmé la restitution. Le trouveur doit maintenant confirmer la remise.'
      else 'Le trouveur a confirmé la remise. Le propriétaire doit maintenant confirmer la restitution.'
    end,
    true
  );

  return jsonb_build_object('status', v_conversation.status, 'completed', v_completed);
end;
$$;

revoke execute on function public.confirm_return(uuid, text) from public;
grant execute on function public.confirm_return(uuid, text) to authenticated;

alter table notifications
  add column if not exists attempts integer not null default 0,
  add column if not exists next_attempt_at timestamptz;

create index notifications_dispatch_idx on notifications (next_attempt_at, created_at)
  where sent_at is null and error is null;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
