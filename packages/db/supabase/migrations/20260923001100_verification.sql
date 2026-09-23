-- =============================================================================
-- Liguita — 0011 · Vérification de propriété (Sprint 5)
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.3, §7.5, Sprint 5
--
-- 5.1  Tables `claims`, `verification_answers`, `fraud_cases` + RLS
-- 5.5  Limite de 3 tentatives (attempt_count) + dossier de fraude automatique
--
-- `verification_questions` et son seed existent déjà (0002 / 0007).
--
-- ⚠️ Les réponses d'un claimant ne sont JAMAIS renvoyées après soumission :
--   · claimant : lit l'état de sa demande, pas les réponses stockées ;
--   · trouveur / staff : réponses visibles uniquement pour une revue manuelle.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 — Demandes de restitution (claims)
-- -----------------------------------------------------------------------------

create table claims (
  id                 uuid primary key default gen_random_uuid(),
  match_id           uuid not null references matches(id) on delete cascade,
  claimant_id        uuid not null references profiles(id) on delete cascade,
  status             claim_status not null default 'DRAFT',
  score              int not null default 0 check (score between 0 and 100),
  reviewed_by        uuid references profiles(id),
  reviewed_at        timestamptz,
  rejection_reason   text,
  attempt_count      int not null default 0 check (attempt_count >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (match_id, claimant_id)
);

comment on table claims is
  'Demande de preuve de propriété sur une correspondance. attempt_count compte les tentatives échouées (max 3).';

create index claims_match_idx on claims (match_id, status);
create index claims_claimant_idx on claims (claimant_id, created_at desc);
create index claims_review_idx on claims (status, created_at) where status = 'UNDER_REVIEW';

create trigger claims_set_updated_at
  before update on claims
  for each row execute function public.set_updated_at();

alter table claims enable row level security;
alter table claims force row level security;

grant select, insert, update on claims to authenticated;

-- Parties à la correspondance + staff.
create or replace function public.is_match_party(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from matches m
    join lost_items l on l.id = m.lost_item_id
    join found_items f on f.id = m.found_item_id
    where m.id = p_match_id
      and (
        l.user_id = (select auth.uid())
        or f.finder_id = (select auth.uid())
      )
  )
  or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN');
$$;

comment on function public.is_match_party(uuid) is
  'Vrai si l''utilisateur connecté est partie à la correspondance (perte ou trouvaille) ou staff.';

revoke execute on function public.is_match_party(uuid) from public, anon;
grant execute on function public.is_match_party(uuid) to authenticated, service_role;

create policy claims_select_parties on claims
  for select to authenticated
  using (
    claimant_id = (select auth.uid())
    or public.is_match_party(match_id)
  );

-- Seul le propriétaire de la perte appariée peut introduire une demande.
create policy claims_insert_owner on claims
  for insert to authenticated
  with check (
    claimant_id = (select auth.uid())
    and exists (
      select 1
      from matches m
      join lost_items l on l.id = m.lost_item_id
      where m.id = match_id
        and l.user_id = (select auth.uid())
    )
  );

-- Claimant : uniquement tant que la demande n'est pas verrouillée / approuvée.
-- Staff : revue manuelle (reviewed_by, status UNDER_REVIEW → APPROVED/REJECTED).
create policy claims_update_owner_or_staff on claims
  for update to authenticated
  using (
    (
      claimant_id = (select auth.uid())
      and status in ('DRAFT', 'QUESTIONS_SENT', 'ANSWERS_SUBMITTED', 'REJECTED')
    )
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  )
  with check (
    (
      claimant_id = (select auth.uid())
      and status in ('DRAFT', 'QUESTIONS_SENT', 'ANSWERS_SUBMITTED', 'REJECTED', 'UNDER_REVIEW', 'APPROVED')
    )
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

-- -----------------------------------------------------------------------------
-- Réponses (5.1)
-- -----------------------------------------------------------------------------
-- `answer` est sensible : pas de policy SELECT pour le claimant après soumission.
-- Le flux applicatif écrit via service_role (soumission) ou stocke avant de ne plus
-- lire. La revue manuelle (staff) lit les réponses pour noter `is_correct`.

create table verification_answers (
  id             uuid primary key default gen_random_uuid(),
  claim_id       uuid not null references claims(id) on delete cascade,
  question_id    uuid not null references verification_questions(id),
  answer         text,
  answer_photo   text,
  is_correct     boolean,
  points_awarded int not null default 0 check (points_awarded >= 0),
  created_at     timestamptz not null default now()
);

create index verification_answers_claim_idx on verification_answers (claim_id);

comment on table verification_answers is
  'Réponses d''une tentative de vérification. Jamais relues par le claimant après soumission.';

alter table verification_answers enable row level security;
alter table verification_answers force row level security;

grant select, insert, update on verification_answers to authenticated;

-- Lecture : staff uniquement (revue manuelle §7.5 / Sprint 5.6).
-- Le claimant ne revoit pas ses réponses (critère d''acceptation 2).
-- Le trouveur non plus tant qu''il n''est pas en révision : les politiques staff
-- couvrent le cas où le trouveur a aussi un rôle modérateur via JWT.
create policy verification_answers_select_staff on verification_answers
  for select to authenticated
  using (
    (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

-- Insertion : via une claim appartenant à l'utilisateur (service_role contourne RLS ;
-- en RLS, le claimant insère pendant la soumission).
create policy verification_answers_insert_claimant on verification_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from claims c
      where c.id = claim_id
        and c.claimant_id = (select auth.uid())
        and c.status in ('DRAFT', 'QUESTIONS_SENT', 'ANSWERS_SUBMITTED', 'REJECTED')
    )
  );

create policy verification_answers_update_staff on verification_answers
  for update to authenticated
  using (
    (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  )
  with check (
    (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

-- -----------------------------------------------------------------------------
-- Dossiers de fraude (5.5)
-- -----------------------------------------------------------------------------

create table fraud_cases (
  id              uuid primary key default gen_random_uuid(),
  subject_user_id uuid references profiles(id) on delete set null,
  kind            report_reason,
  signals         jsonb not null default '{}'::jsonb,
  risk_score      int not null default 0 check (risk_score between 0 and 100),
  status          text not null default 'OPEN'
                  check (status in ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  assigned_to     uuid references profiles(id) on delete set null,
  resolution      text,
  created_at      timestamptz not null default now(),
  closed_at       timestamptz
);

create index fraud_cases_status_idx on fraud_cases (status, created_at desc);
create index fraud_cases_subject_idx on fraud_cases (subject_user_id);

comment on table fraud_cases is
  'Signalements anti-fraude. Ouvert automatiquement après 3 échecs de vérification (§7.5).';

alter table fraud_cases enable row level security;
alter table fraud_cases force row level security;

grant select, update on fraud_cases to authenticated;

-- Lecture / clôture : staff. Insertion : service_role uniquement (pas de policy INSERT).
create policy fraud_cases_select_staff on fraud_cases
  for select to authenticated
  using (
    (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

create policy fraud_cases_update_staff on fraud_cases
  for update to authenticated
  using (
    (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  )
  with check (
    (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );

-- -----------------------------------------------------------------------------
-- Questions : lecture publique (référentiel sans PII)
-- -----------------------------------------------------------------------------
-- 0002 créait la table sans RLS ni GRANT : inaccessible au rôle applicatif.
-- Les questions ne portent aucune donnée personnelle — lecture ouverte.

alter table verification_questions enable row level security;
alter table verification_questions force row level security;

grant select on verification_questions to anon, authenticated;

create policy verification_questions_public_read on verification_questions
  for select to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Secrets de vérification côté trouveur (optionnel, barème automatique)
-- -----------------------------------------------------------------------------
-- Table séparée plutôt que colonne sur `found_items` : cette table est lue en RLS
-- anonyme pour la vitrine (`found_items_select_all`). Une colonne privée y serait
-- exposée. Seul le trouveur propriétaire (et staff) lit/écrit ses secrets.

create table found_item_secrets (
  found_item_id uuid primary key references found_items(id) on delete cascade,
  /** Réponses attendues indexées par code de question config (`doc-name`, …). */
  answers       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table found_item_secrets is
  'Réponses attendues du trouveur pour le barème automatique (§7.5). Indexées par code de question. Jamais publiques.';

create trigger found_item_secrets_set_updated_at
  before update on found_item_secrets
  for each row execute function public.set_updated_at();

alter table found_item_secrets enable row level security;
alter table found_item_secrets force row level security;

grant select, insert, update on found_item_secrets to authenticated;

create policy found_item_secrets_owner_all on found_item_secrets
  for all to authenticated
  using (
    exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  )
  with check (
    exists (
      select 1 from found_items f
      where f.id = found_item_id and f.finder_id = (select auth.uid())
    )
    or (select coalesce(auth.jwt() ->> 'app_role', 'USER')) in ('MODERATOR', 'ADMIN')
  );
