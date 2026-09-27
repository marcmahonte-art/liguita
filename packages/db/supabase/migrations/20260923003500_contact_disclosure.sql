-- =============================================================================
-- LIGUITA — 03500 — Consentement et divulgation du contact du trouveur
-- =============================================================================
-- Regle metier arbitree le 27/09/2026 :
--
--   R2. Une fois le paiement confirme, LIGUITA transmet au chercheur le numero
--       de telephone du trouveur — sous reserve que celui-ci ait signe la fiche
--       de consentement a l'inscription (consentement OBLIGATOIRE et bloquant).
--
-- ⚠️ Cette migration ne traite QUE le consentement et la divulgation.
--    Les demandes de retrait du trouveur (minimum 2 500 XAF) sont implementees
--    par 20260923003000_wallet_and_withdrawals.sql, qui fait autorite : ne pas
--    dupliquer ici de table de retrait.
--
-- Ce fichier REIMPLEMENTE public.mark_payment_paid pour y ajouter la
-- divulgation du contact. Le corps est repris a l'identique de la migration
-- 20260923001300, seules les lignes marquees « AJOUT » sont nouvelles :
-- ne jamais reecrire cette fonction depuis zero sans repartir de 01300.
-- =============================================================================


-- Nature du consentement recueilli. Un enum (et non du texte libre) pour que
-- chaque nature ait un texte de reference versionne, opposable en cas de litige.
create type consent_kind as enum (
  'CONTACT_DISCLOSURE',  -- transmettre mon numero au chercheur apres paiement
  'TERMS',               -- conditions generales d'utilisation
  'PRIVACY'              -- politique de confidentialite
);


-- -----------------------------------------------------------------------------
-- 2. Consentements
-- -----------------------------------------------------------------------------

create table consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          consent_kind not null,
  -- Version du texte accepte : indispensable pour prouver *ce qui* a ete
  -- accepte, un texte pouvant changer. Ex. « 2026-09-v1 ».
  version       text not null,
  -- Horodatage serveur, jamais fourni par le client : c'est la seule valeur
  -- opposable. Ne pas confondre avec created_at, qui peut differer si l'on
  -- importe un historique (mention « signee hors ligne le ... »).
  accepted_at   timestamptz not null default now(),
  -- Traces techniques : necessaires pour defendre la validite du recueil.
  ip_address    text,
  user_agent    text,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- Un utilisateur ne signe qu'une fois une version donnee d'une nature donnee.
create unique index consents_user_kind_version_idx
  on consents (user_id, kind, version);

create index consents_user_idx on consents (user_id, accepted_at desc);

-- Vue pratique : qui a un consentement de divulgation encore valide ?
-- Utilisee par mark_payment_paid et par la garde d'inscription.
create or replace function public.has_active_consent(p_user_id uuid, p_kind consent_kind)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.consents c
    where c.user_id = p_user_id
      and c.kind = p_kind
      and c.revoked_at is null
  );
$$;

revoke execute on function public.has_active_consent(uuid, consent_kind) from public;
grant execute on function public.has_active_consent(uuid, consent_kind) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. RLS — consentements
-- -----------------------------------------------------------------------------

alter table consents enable row level security;
alter table consents force row level security;

grant select, insert on consents to authenticated;

-- L'utilisateur voit et cree les siens, jamais ceux des autres. Ecriture
-- volontairement limitee a l'insertion : un consentement ne se modifie pas, il
-- se revoque (update de revoked_at) — et la revocation passe par une fonction
-- dediee pour horodater proprement.
create policy consents_select_self on consents
  for select to authenticated using (user_id = (select auth.uid()));

create policy consents_insert_self on consents
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy consents_staff_read on consents
  for select to authenticated using (
    (select auth.jwt() ->> 'app_role') in ('MODERATOR', 'ADMIN')
  );


-- -----------------------------------------------------------------------------
-- 3. Divulgation du contact du trouveur
-- -----------------------------------------------------------------------------
-- Seul le chercheur (celui qui a paye) obtient le numero, et seulement si le
-- trouveur a un consentement CONTACT_DISCLOSURE actif. Trois refus explicites
-- plutot qu'un `null` muet : l'appelant sait *pourquoi* c'est verrouille.

create or replace function public.get_finder_contact(p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_owner_id uuid;
  v_finder_id uuid;
  v_paid boolean;
  v_consent boolean;
  v_finder public.profiles%rowtype;
begin
  if v_user is null then raise exception 'Authentification requise'; end if;

  select l.user_id, f.finder_id into v_owner_id, v_finder_id
  from public.matches m
  join public.lost_items l on l.id = m.lost_item_id
  join public.found_items f on f.id = m.found_item_id
  where m.id = p_match_id;

  if v_owner_id is null then raise exception 'Correspondance introuvable'; end if;

  -- Seul le chercheur (le payeur) obtient le numero. Le trouveur n'a pas
  -- besoin de la fonction : il connait deja le sien.
  if v_user <> v_owner_id then
    raise exception 'Contact reserve au chercheur de l objet'
      using errcode = 'insufficient_privilege';
  end if;

  select exists (
    select 1 from public.transactions t
    where t.match_id = p_match_id and t.status = 'PAID'
  ) into v_paid;

  if not v_paid then
    return jsonb_build_object('status', 'LOCKED', 'reason', 'PAYMENT_REQUIRED',
                              'finder_phone', null);
  end if;

  v_consent := public.has_active_consent(v_finder_id, 'CONTACT_DISCLOSURE');
  if not v_consent then
    return jsonb_build_object('status', 'LOCKED', 'reason', 'NO_CONSENT',
                              'finder_phone', null);
  end if;

  select * into v_finder from public.profiles where id = v_finder_id;
  if v_finder.id is null or v_finder.phone is null or trim(v_finder.phone) = '' then
    return jsonb_build_object('status', 'LOCKED', 'reason', 'NO_PHONE',
                              'finder_phone', null);
  end if;

  return jsonb_build_object(
    'status', 'AVAILABLE',
    'finder_phone', v_finder.phone,
    'finder_name', coalesce(nullif(trim(v_finder.display_name), ''), nullif(trim(v_finder.full_name), '')),
    'finder_is_samaritan', coalesce(v_finder.is_samaritan, false),
    'disclosed_at', now()
  );
end;
$$;

revoke execute on function public.get_finder_contact(uuid) from public;
grant execute on function public.get_finder_contact(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 4. mark_payment_paid — reimplementation avec annonce de restitution
-- -----------------------------------------------------------------------------
-- Corps identique a 20260923001300, a l'exception du message systeme insere
-- dans la conversation : il annonce desormais que le contact est disponible
-- via la fiche de restitution. Le numero lui-meme n'est PAS ecrit ici (§3).

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
  v_contact jsonb;
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

  -- AJOUT 01700 : le message systeme annonce la disponibilite du contact.
  if v_created then
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (
      v_conversation_id, v_owner_id,
      'Paiement confirme. Le contact du trouveur est desormais disponible dans la fiche de restitution. Vous pouvez aussi continuer a echanger ici.',
      true
    );
  else
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (
      v_conversation_id, v_owner_id,
      'Paiement confirme. Le contact du trouveur est desormais disponible.',
      true
    );
  end if;

  -- AJOUT 01700 : on calcule l'etat de la divulgation pour l'information du
  -- code appelant, mais le NUMERO N'EST PAS inclus (voir §7 : payment_events
  -- conserve ce retour, et le staff peut le lire).
  v_contact := public.get_finder_contact(v_quote.match_id);

  insert into public.notifications (user_id, kind, channel, title, body, payload, sent_at)
  values (
    v_finder_id, 'PAYMENT_RECEIVED', 'WEB',
    'Vous pouvez etre recontacte',
    'Le chercheur a regle les frais. Vous pouvez convenir de la restitution dans la conversation.',
    jsonb_build_object('match_id', v_quote.match_id, 'conversation_id', v_conversation_id),
    now()
  );

  return jsonb_build_object(
    'status', 'PAID',
    'conversation_id', v_conversation_id,
    'idempotent', false,
    'contact_status', coalesce(v_contact ->> 'status', 'LOCKED')
  );
end;
$$;

revoke execute on function public.mark_payment_paid(uuid, text, jsonb, text) from public;
grant execute on function public.mark_payment_paid(uuid, text, jsonb, text) to service_role;



-- -----------------------------------------------------------------------------
-- 5. Etat du consentement a l'inscription
-- -----------------------------------------------------------------------------
-- Lu par le middleware pour bloquer l'acces tant que la fiche n'est pas signee.

create or replace function public.registration_consent_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_current_version text := '2026-09-v1';
begin
  if v_user is null then raise exception 'Authentification requise'; end if;
  return jsonb_build_object(
    'required_version', v_current_version,
    'contact_disclosure', exists (
      select 1 from public.consents
      where user_id = v_user and kind = 'CONTACT_DISCLOSURE'
        and version = v_current_version and revoked_at is null
    ),
    'terms', exists (
      select 1 from public.consents
      where user_id = v_user and kind = 'TERMS'
        and version = v_current_version and revoked_at is null
    )
  );
end;
$$;

revoke execute on function public.registration_consent_state() from public;
grant execute on function public.registration_consent_state() to authenticated;


-- -----------------------------------------------------------------------------
-- 10. Journal d'audit


notify pgrst, 'reload schema';
