-- =============================================================================
-- Liguita — 0003 · Grille tarifaire versionnée
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §5
-- Source de vérité tarifaire : docs/Liguita_Grille_Tarifaire.xlsx
--
-- ⚠️ Principe non négociable : une grille tarifaire est **immuable**.
--
-- Modifier un montant en base ferait diverger le résultat du moteur TypeScript
-- (`packages/core/pricing`) de celui de la base, et surtout : un devis émis hier
-- serait recalculé aujourd'hui avec d'autres montants. Le client verrait un prix,
-- puis un autre. C'est intenable juridiquement et commercialement.
--
-- Toute évolution crée donc une **nouvelle version** : on insère une ligne, on
-- désactive l'ancienne, on ne modifie jamais les montants d'une ligne existante.
-- Un déclencheur le garantit (voir plus bas), plutôt que de compter sur la discipline.
-- =============================================================================

create table pricing_rules (
  id                    uuid primary key default gen_random_uuid(),
  country_code          char(2) not null references countries(code),
  currency              char(3) not null default 'XAF',
  version               int not null,
  is_active             boolean not null default false,

  -- ---------- Frais de base par classe ----------
  fee_c1                int not null default 300,
  fee_c2                int not null default 700,
  fee_c3                int not null default 1200,
  fee_c4                int not null default 3000,

  -- ---------- Classe C5 : pourcentage borné ----------
  fee_c5_rate           numeric(5, 4) not null default 0.0100,
  fee_c5_floor          int not null default 5000,
  fee_c5_ceiling        int not null default 25000,

  -- ---------- Récompense du trouveur ----------
  reward_c1             int not null default 100,
  reward_c2             int not null default 250,
  reward_c3             int not null default 400,
  reward_c4             int not null default 900,
  reward_c5_rate        numeric(5, 4) not null default 0.3000,

  -- ---------- Options ----------
  urgent_rate           numeric(5, 4) not null default 0.5000,
  conciergerie_fee      int not null default 1000,
  delivery_fee          int not null default 2500,
  delivery_is_proxy     boolean not null default true,

  -- ---------- Fiscalité ----------
  vat_rate              numeric(5, 4) not null default 0.1800,
  commission_is_ht      boolean not null default true,

  -- ---------- Bornes de classe ----------
  class_upgrade_thresholds jsonb not null default '{"C5": 1000000}'::jsonb,
  value_bands           jsonb not null default
    '[{"upTo": 60000, "pricingClass": "C1"},
      {"upTo": 100000, "pricingClass": "C2"},
      {"upTo": 300000, "pricingClass": "C3"},
      {"upTo": null,   "pricingClass": "C4"}]'::jsonb,

  effective_from        timestamptz not null default now(),
  effective_to          timestamptz,
  created_by            uuid,
  created_at            timestamptz not null default now(),

  unique (country_code, version),

  -- ---------- Invariants de cohérence ----------
  constraint pricing_rules_positive_fees check (
    fee_c1 > 0 and fee_c2 > 0 and fee_c3 > 0 and fee_c4 > 0
  ),
  constraint pricing_rules_positive_rewards check (
    reward_c1 > 0 and reward_c2 > 0 and reward_c3 > 0 and reward_c4 > 0
  ),
  constraint pricing_rules_c5_band check (
    fee_c5_floor > 0 and fee_c5_ceiling >= fee_c5_floor
  ),
  constraint pricing_rules_rates check (
    fee_c5_rate > 0 and fee_c5_rate <= 1
    and reward_c5_rate > 0 and reward_c5_rate <= 1
    and urgent_rate >= 0 and urgent_rate <= 10
    and vat_rate >= 0 and vat_rate < 1
  ),
  -- La récompense ne peut pas dépasser les frais : Liguita ne peut pas payer plus
  -- qu'elle n'encaisse.
  constraint pricing_rules_reward_below_fee check (
    reward_c1 <= fee_c1
    and reward_c2 <= fee_c2
    and reward_c3 <= fee_c3
    and reward_c4 <= fee_c4
    and reward_c5_rate < 1
  ),
  constraint pricing_rules_effective_window check (
    effective_to is null or effective_to > effective_from
  )
);

-- Une seule grille active par pays : sans cette contrainte, deux versions actives
-- coexisteraient et le prix dépendrait de l'ordre de lecture de la table.
create unique index pricing_rules_one_active_per_country
  on pricing_rules (country_code)
  where is_active;

comment on table pricing_rules is
  'Grille tarifaire versionnée. Immuable : toute évolution crée une nouvelle version. Un devis référence la version appliquée au moment de son calcul.';

comment on column pricing_rules.delivery_is_proxy is
  'Vrai tant que delivery_fee est une estimation non contractuelle. L''option livraison doit rester désactivée en production tant que ce drapeau est vrai.';

comment on column pricing_rules.commission_is_ht is
  'Vrai si la commission est exprimée hors taxes. Le montant de TVA est alors extrait du total affiché, jamais ajouté par-dessus.';

-- -----------------------------------------------------------------------------
-- Immuabilité des montants
-- -----------------------------------------------------------------------------

-- Seuls `is_active` et `effective_to` peuvent évoluer sur une ligne existante :
-- activer une version, ou clore une version. Toute autre modification doit passer
-- par une nouvelle version.
create or replace function public.pricing_rules_prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  if new.country_code          <> old.country_code
     or new.currency           <> old.currency
     or new.version            <> old.version
     or new.fee_c1             <> old.fee_c1
     or new.fee_c2             <> old.fee_c2
     or new.fee_c3             <> old.fee_c3
     or new.fee_c4             <> old.fee_c4
     or new.fee_c5_rate        <> old.fee_c5_rate
     or new.fee_c5_floor       <> old.fee_c5_floor
     or new.fee_c5_ceiling     <> old.fee_c5_ceiling
     or new.reward_c1          <> old.reward_c1
     or new.reward_c2          <> old.reward_c2
     or new.reward_c3          <> old.reward_c3
     or new.reward_c4          <> old.reward_c4
     or new.reward_c5_rate     <> old.reward_c5_rate
     or new.urgent_rate        <> old.urgent_rate
     or new.conciergerie_fee   <> old.conciergerie_fee
     or new.delivery_fee       <> old.delivery_fee
     or new.vat_rate           <> old.vat_rate
     or new.commission_is_ht   <> old.commission_is_ht
     or new.class_upgrade_thresholds <> old.class_upgrade_thresholds
     or new.value_bands        <> old.value_bands
  then
    raise exception
      'Grille tarifaire immuable (version %). Créer une nouvelle version au lieu de modifier les montants : les devis déjà émis référencent cette ligne.',
      old.version
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger pricing_rules_immutable
  before update on pricing_rules
  for each row
  execute function public.pricing_rules_prevent_mutation();

-- La suppression d'une grille est interdite : un devis peut y référer.
create or replace function public.pricing_rules_prevent_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Une grille tarifaire ne se supprime pas : la désactiver (is_active = false) et renseigner effective_to.'
    using errcode = 'restrict_violation';
end;
$$;

create trigger pricing_rules_no_delete
  before delete on pricing_rules
  for each row
  execute function public.pricing_rules_prevent_delete();

-- -----------------------------------------------------------------------------
-- Seed : grille v1
-- -----------------------------------------------------------------------------
-- Les valeurs sont strictement celles de docs/Liguita_Grille_Tarifaire.xlsx et de
-- `packages/core/src/pricing/default-rule.ts`. Le test
-- `packages/core/src/pricing/__tests__/compute.test.ts` vérifie que le moteur
-- TypeScript produit exactement ces montants sur les 18 cas dorés.

insert into pricing_rules (
  country_code, currency, version, is_active,
  fee_c1, fee_c2, fee_c3, fee_c4,
  fee_c5_rate, fee_c5_floor, fee_c5_ceiling,
  reward_c1, reward_c2, reward_c3, reward_c4, reward_c5_rate,
  urgent_rate, conciergerie_fee, delivery_fee, delivery_is_proxy,
  vat_rate, commission_is_ht,
  class_upgrade_thresholds, value_bands,
  effective_from
) values (
  'TD', 'XAF', 1, true,
  300, 700, 1200, 3000,
  0.0100, 5000, 25000,
  100, 250, 400, 900, 0.3000,
  0.5000, 1000, 2500, true,
  0.1800, true,
  '{"C5": 1000000}'::jsonb,
  '[{"upTo": 60000, "pricingClass": "C1"},
    {"upTo": 100000, "pricingClass": "C2"},
    {"upTo": 300000, "pricingClass": "C3"},
    {"upTo": null,   "pricingClass": "C4"}]'::jsonb,
  now()
);

-- La clé étrangère `created_by -> profiles(id)` est ajoutée en Sprint 1, quand la
-- table `profiles` existe. L'ordre des migrations interdit de référencer une table
-- qui n'existe pas encore.
