-- =============================================================================
-- Liguita — 0001 · Extensions et types énumérés
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.1 et §4.2
--
-- Cette migration ne crée aucune table : elle prépare le socle dont tout le reste
-- dépend. Elle est volontairement séparée pour qu'un échec d'extension (par exemple
-- `pg_cron` absent d'une instance PostgreSQL locale) soit immédiatement identifiable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------

-- `gen_random_uuid()` pour les clés primaires.
create extension if not exists "pgcrypto";

-- `similarity()` et les index GIN trigrammes : c'est ce qui permet au moteur de
-- correspondance de tourner en base sur plusieurs centaines de milliers d'annonces.
create extension if not exists "pg_trgm";

-- Recherche insensible aux accents : « ecran » doit trouver « Écran ».
create extension if not exists "unaccent";

-- Tâches planifiées (purge des rétentions, recalcul des correspondances).
-- Disponible sur Supabase hébergé et dans l'image locale `supabase/postgres`.
-- Sur une instance PostgreSQL nue, l'extension peut être absente : on n'échoue pas,
-- on prévient. Les workers peuvent toujours être déclenchés par un planificateur externe.
do $$
begin
  create extension if not exists "pg_cron";
exception
  when feature_not_supported or insufficient_privilege or undefined_file then
    raise warning 'pg_cron indisponible : les tâches planifiées devront être déclenchées par un ordonnanceur externe.';
end
$$;

-- -----------------------------------------------------------------------------
-- Recherche insensible aux accents
-- -----------------------------------------------------------------------------

-- `unaccent()` est déclarée STABLE, pas IMMUTABLE, car elle dépend du dictionnaire
-- courant. PostgreSQL refuse donc de l'utiliser dans un index. Cette enveloppe fige
-- explicitement le dictionnaire et devient IMMUTABLE : c'est le seul moyen d'indexer
-- un texte sans accents, et c'est ce que la recherche utilise partout.
create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select public.unaccent('public.unaccent'::regdictionary, value)
$$;

comment on function public.immutable_unaccent(text) is
  'Enveloppe IMMUTABLE de unaccent(), utilisable dans un index. Ne pas modifier le dictionnaire sans reconstruire les index qui en dépendent.';

-- -----------------------------------------------------------------------------
-- Classification tarifaire
-- -----------------------------------------------------------------------------

-- Les cinq classes de la grille v1 (docs/Liguita_Grille_Tarifaire.xlsx).
-- C1 à C4 sont des montants fixes, C5 est un pourcentage borné.
create type pricing_class as enum ('C1', 'C2', 'C3', 'C4', 'C5');

-- -----------------------------------------------------------------------------
-- Cycle de vie des objets
-- -----------------------------------------------------------------------------

create type item_status as enum (
  'FOUND',
  'IN_INVENTORY',
  'MATCH_POSSIBLE',
  'OWNER_IDENTIFIED',
  'RETURN_IN_PROGRESS',
  'RETURNED',
  'ARCHIVED'
);

create type lost_status as enum (
  'DECLARED',
  'SEARCHING',
  'MATCH_FOUND',
  'VERIFYING',
  'PAID',
  'RETURNED',
  'CLOSED',
  'EXPIRED'
);

-- -----------------------------------------------------------------------------
-- Correspondance et vérification de propriété
-- -----------------------------------------------------------------------------

-- Les trois niveaux du moteur de correspondance (§6.3). Les seuils sont 90 et 70 ;
-- « WEAK » regroupe tout ce qui est persisté sous le seuil de notification.
create type match_level as enum ('VERY_LIKELY', 'POSSIBLE', 'WEAK');

create type match_status as enum (
  'NEW',
  'SEEN',
  'CLAIMED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED'
);

create type claim_status as enum (
  'DRAFT',
  'QUESTIONS_SENT',
  'ANSWERS_SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DISPUTED',
  'EXPIRED'
);

-- -----------------------------------------------------------------------------
-- Options payantes
-- -----------------------------------------------------------------------------

-- `COMMUNITY_BONUS` n'est pas un supplément : il est intégralement reversé au trouveur
-- et Liguita n'y prélève aucune commission. Il figure dans le même type pour que le
-- détail d'un devis reste une seule liste ordonnée.
create type pricing_option as enum ('URGENT', 'CONCIERGERIE', 'DELIVERY', 'COMMUNITY_BONUS');

-- -----------------------------------------------------------------------------
-- Paiement et récompense
-- -----------------------------------------------------------------------------

create type payment_status as enum (
  'INITIATED',
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

create type reward_status as enum ('PENDING', 'RESERVED', 'RELEASED', 'FORFEITED', 'DONATED');

-- -----------------------------------------------------------------------------
-- Rôles et abonnements
-- -----------------------------------------------------------------------------

create type org_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'READONLY');
create type app_role as enum ('USER', 'BUSINESS', 'MODERATOR', 'ADMIN');
create type subscription_status as enum ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- -----------------------------------------------------------------------------
-- Signalements
-- -----------------------------------------------------------------------------

create type report_reason as enum (
  'FAKE_FOUND_ITEM',
  'FAKE_OWNER',
  'FAKE_PAYMENT',
  'DUPLICATE_CLAIM',
  'OFF_PLATFORM_SOLICITATION',
  'INAPPROPRIATE_CONTENT',
  'OTHER'
);
