-- =============================================================================
-- Liguita — 0002 · Référentiels
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.3
--
-- Pays, villes, quartiers, types de lieux, lieux, catégories d'objets, types d'objets.
--
-- Ces tables sont peu nombreuses, peu volumineuses (quelques milliers de lignes au plus)
-- et **lues par tout le monde** : la page d'accueil, la recherche, le formulaire de
-- déclaration et le calcul tarifaire en dépendent tous. Elles sont donc en lecture
-- publique et en écriture réservée au service (voir migration 0004).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pays
-- -----------------------------------------------------------------------------

create table countries (
  code          char(2) primary key,
  name          text not null,
  name_ar       text,
  currency      char(3) not null,
  phone_prefix  text not null,
  languages     text[] not null default '{fr}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table countries is
  'Pays desservis. Le Tchad est le seul actif au lancement ; les voisins sont présents mais inactifs pour absorber un objet perdu qui franchit une frontière.';

-- -----------------------------------------------------------------------------
-- Villes
-- -----------------------------------------------------------------------------

create table cities (
  id            uuid primary key default gen_random_uuid(),
  country_code  char(2) not null references countries(code),
  name          text not null,
  name_ar       text,
  slug          text not null,
  lat           numeric(9, 6),
  lng           numeric(9, 6),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (country_code, slug)
);

comment on column cities.slug is
  'Clé stable utilisée dans les URL publiques. « N''Djamena » s''écrit de plusieurs façons : l''URL ne doit jamais dépendre de l''orthographe du nom.';

create index cities_country_idx on cities (country_code) where is_active;

-- -----------------------------------------------------------------------------
-- Quartiers
-- -----------------------------------------------------------------------------

create table neighborhoods (
  id        uuid primary key default gen_random_uuid(),
  city_id   uuid not null references cities(id) on delete cascade,
  name      text not null,
  slug      text not null,
  arrondissement int,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);

create index neighborhoods_city_idx on neighborhoods (city_id);

comment on column neighborhoods.arrondissement is
  'Arrondissement de rattachement, utilisé pour regrouper les quartiers dans l''interface. Nullable : tous les quartiers ne sont pas rattachés de façon certaine.';

-- -----------------------------------------------------------------------------
-- Types de lieux
-- -----------------------------------------------------------------------------

create table place_types (
  code      text primary key,
  label_fr  text not null,
  label_ar  text,
  icon      text,
  sort_order int not null default 0
);

comment on table place_types is
  'Typage des lieux. Il conditionne la question posée à l''utilisateur : un objet trouvé dans un taxi ne se récupère pas comme un objet trouvé dans un aéroport.';

-- -----------------------------------------------------------------------------
-- Lieux
-- -----------------------------------------------------------------------------

create table places (
  id              uuid primary key default gen_random_uuid(),
  city_id         uuid not null references cities(id),
  neighborhood_id uuid references neighborhoods(id),
  place_type      text not null references place_types(code),
  name            text not null,
  slug            text not null unique,
  organization_id uuid,
  lat             numeric(9, 6),
  lng             numeric(9, 6),
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now()
);

create index places_city_idx on places (city_id);
create index places_neighborhood_idx on places (neighborhood_id);
create index places_type_idx on places (place_type);

-- Recherche par nom de lieu, insensible aux accents et tolérante aux fautes de frappe.
create index places_name_trgm_idx on places using gin (public.immutable_unaccent(name) gin_trgm_ops);

comment on column places.is_verified is
  'Vrai quand le gestionnaire du lieu tient un registre d''objets trouvés. Passer cette colonne à vrai est une décision métier : elle engendre une obligation de tenue de registre.';

-- La clé étrangère vers `organizations` est ajoutée en Sprint 1, quand la table existe.
-- L'ordre des migrations interdit de référencer une table qui n'existe pas encore.

-- -----------------------------------------------------------------------------
-- Catégories d'objets
-- -----------------------------------------------------------------------------

create table item_categories (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid references item_categories(id) on delete restrict,
  code            text not null unique,
  label_fr        text not null,
  label_ar        text,
  icon            text,
  default_class   pricing_class not null,
  min_value_xaf   bigint,
  max_value_xaf   bigint,
  is_sensitive    boolean not null default false,
  asks_declared_value boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),

  -- Une catégorie ne peut pas être sa propre parente.
  constraint item_categories_not_self_parent check (parent_id is null or parent_id <> id),

  -- Les bornes de valeur doivent être cohérentes.
  constraint item_categories_value_range check (
    min_value_xaf is null
    or max_value_xaf is null
    or min_value_xaf <= max_value_xaf
  )
);

create index item_categories_parent_idx on item_categories (parent_id);

comment on column item_categories.code is
  'Slug stable, partagé avec packages/config. Changer un code casse les devis déjà émis : on ajoute une catégorie, on n''en renomme jamais une.';

comment on column item_categories.is_sensitive is
  'Vrai pour les documents d''identité : déclenche le floutage automatique de la photo et masque le numéro du document.';

comment on column item_categories.asks_declared_value is
  'Faux quand demander une valeur n''a pas de sens — une carte d''identité n''a pas de valeur marchande. Le formulaire masque alors le champ.';

comment on column item_categories.max_value_xaf is
  'Plafond usuel de la catégorie. Au-delà, l''objet monte d''une classe tarifaire. NULL = pas de plafond connu.';

-- -----------------------------------------------------------------------------
-- Types d'objets
-- -----------------------------------------------------------------------------

create table item_types (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references item_categories(id) on delete cascade,
  code          text not null,
  label_fr      text not null,
  label_ar      text,
  default_class pricing_class,
  keywords      text[] not null default '{}',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (category_id, code)
);

create index item_types_category_idx on item_types (category_id);

-- Recherche par nom de type, insensible aux accents et tolérante aux fautes de frappe.
create index item_types_label_trgm_idx
  on item_types using gin (public.immutable_unaccent(label_fr) gin_trgm_ops);

comment on column item_types.default_class is
  'Surcharge la classe de la catégorie quand le type est intrinsèquement d''un autre niveau. NULL = la classe de la catégorie s''applique.';

-- -----------------------------------------------------------------------------
-- Questions de vérification de propriété
-- -----------------------------------------------------------------------------

-- Ajout par rapport au DDL du plan v3 §4.3 : la Definition of Done du Sprint 0 exige
-- « 6 catégories avec icônes et questions de vérification renseignées ». Les questions
-- sont donc un référentiel à part entière, versionnable sans redéploiement applicatif.
--
-- ⚠️ Une question ne doit JAMAIS porter sur une information déjà publique (la couleur
-- affichée sur la fiche, par exemple) ni demander une donnée secrète complète : on
-- demande le premier chiffre du code de déverrouillage, jamais le code entier.
create table verification_questions (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references item_categories(id) on delete cascade,
  code          text not null,
  prompt_fr     text not null,
  answer_kind   text not null default 'text'
                check (answer_kind in ('text', 'number', 'date', 'choice')),
  choices       text[],
  weight        int not null default 1 check (weight > 0),
  is_required   boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (category_id, code),

  -- Une question à choix fermé doit proposer ses réponses.
  constraint verification_questions_choices check (
    answer_kind <> 'choice'
    or (choices is not null and array_length(choices, 1) >= 2)
  )
);

create index verification_questions_category_idx on verification_questions (category_id);

comment on table verification_questions is
  'Questions de preuve de propriété. Elles s''appliquent à une catégorie racine et sont héritées par ses sous-catégories.';

-- -----------------------------------------------------------------------------
-- Contrainte métier : chaque catégorie terminale doit avoir au moins un type
-- -----------------------------------------------------------------------------

-- Sans type d'objet, le signal « type » du moteur de correspondance plafonne à 0,60,
-- le score maximal tombe à 88 sur 100 et le niveau « très probable » (seuil 90)
-- devient inatteignable. Une catégorie sans type rend donc ses objets impossibles
-- à notifier en priorité.
--
-- La contrainte est vérifiée par un déclencheur différé plutôt qu'une clé étrangère :
-- on veut pouvoir insérer une catégorie puis ses types dans la même transaction.
--
-- `for each row` est imposé par PostgreSQL : un déclencheur `constraint` ne peut pas
-- être déclaré au niveau instruction. Le contrôle s'exécute donc une fois par ligne,
-- à la validation de la transaction. Sur un référentiel de quelques dizaines de lignes,
-- le coût est négligeable et la garantie vaut bien ce coût.
create or replace function public.assert_leaf_category_has_type()
returns trigger
language plpgsql
as $$
declare
  orphan_count int;
begin
  select count(*)
    into orphan_count
    from item_categories c
   where not exists (select 1 from item_categories child where child.parent_id = c.id)
     and not exists (select 1 from item_types t where t.category_id = c.id);

  if orphan_count > 0 then
    raise exception
      'Référentiel incohérent : % catégorie(s) terminale(s) sans type d''objet. Le score de correspondance plafonnerait à 88 et le niveau « très probable » serait inatteignable.',
      orphan_count
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger item_categories_leaf_has_type
  after insert or update on item_categories
  deferrable initially deferred
  for each row
  execute function public.assert_leaf_category_has_type();
