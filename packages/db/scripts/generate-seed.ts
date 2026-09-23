/**
 * Génère `supabase/seed.sql` depuis `@liguita/config`.
 *
 * ⚠️ Pourquoi un générateur plutôt qu'un fichier SQL écrit à la main.
 *
 * Le référentiel existe en deux endroits par nécessité : dans `packages/config`, où il est
 * typé et consommé par l'application et par le moteur de tarification, et dans la base,
 * où il alimente les jointures et les contraintes d'intégrité. Écrire le SQL à la main
 * reviendrait à maintenir deux listes de 22 quartiers, 73 types d'objets et 34 catégories
 * en parallèle. La première divergence passerait inaperçue jusqu'à ce qu'un utilisateur
 * choisisse un quartier absent de la base.
 *
 * Ici, `packages/config` reste la source de vérité unique et ce script projette le
 * référentiel en SQL. Le fichier produit est **versionné** — la revue de code porte donc
 * sur un diff SQL lisible — mais il n'est jamais édité à la main.
 *
 * Le SQL produit est **idempotent** : chaque insertion porte un `on conflict ... do update`
 * sur sa clé naturelle. Rejouer le seed sur une base déjà peuplée met à jour les libellés
 * sans créer de doublons.
 *
 * Usage :
 *   pnpm db:seed:generate
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CATEGORIES,
  CITIES,
  COUNTRIES,
  ITEM_TYPES,
  NEIGHBORHOODS,
  PLACES,
  PLACE_TYPES,
  ROOT_CATEGORIES,
  VERIFICATION_QUESTIONS,
} from '@liguita/config';

/* -------------------------------------------------------------------------- */
/* Écriture de valeurs SQL                                                     */
/* -------------------------------------------------------------------------- */

/** Échappe une chaîne et l'entoure de quotes. L'apostrophe de « N'Djamena » passe ici. */
function text(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function textOrNull(value: string | null | undefined): string {
  return value === null || value === undefined ? 'null::text' : text(value);
}

function integerOrNull(value: number | null | undefined): string {
  return value === null || value === undefined ? 'null::int' : `${value}::int`;
}

function bigintOrNull(value: number | null | undefined): string {
  return value === null || value === undefined ? 'null::bigint' : `${value}::bigint`;
}

function decimal(value: number): string {
  return `${value.toFixed(6)}::numeric(9,6)`;
}

function boolean(value: boolean): string {
  return value ? 'true' : 'false';
}

function textArray(values: readonly string[]): string {
  if (values.length === 0) return 'array[]::text[]';
  return `array[${values.map(text).join(', ')}]::text[]`;
}

function textArrayOrNull(values: readonly string[] | undefined): string {
  return values && values.length > 0 ? textArray(values) : 'null::text[]';
}

/** Indente un bloc `values (...)` pour que le diff Git reste lisible. */
function valuesBlock(rows: readonly (readonly string[])[], indent = '  '): string {
  return rows.map((row) => `${indent}(${row.join(', ')})`).join(',\n');
}

/* -------------------------------------------------------------------------- */
/* Construction du fichier                                                     */
/* -------------------------------------------------------------------------- */

const out: string[] = [];

out.push(`-- =============================================================================
-- Liguita — seed du référentiel
-- =============================================================================
--
-- ⚠️ FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
--
-- Source de vérité : packages/config
-- Régénération     : pnpm db:seed:generate
--
-- Toute correction apportée directement ici serait perdue à la régénération suivante,
-- et surtout : elle ferait diverger la base du référentiel consommé par l'application.
-- Corriger packages/config, puis régénérer.
--
-- Ce seed est idempotent : chaque insertion porte un \`on conflict ... do update\` sur sa
-- clé naturelle. Le rejouer met à jour les libellés sans créer de doublon.
--
-- Le seed s'exécute en une seule transaction (comportement de \`supabase db reset\`), ce
-- qui est indispensable : la contrainte différée qui exige un type d'objet par catégorie
-- terminale n'est vérifiée qu'à la validation, après que les deux tables sont peuplées.
-- =============================================================================

begin;
`);

/* ---------- Pays ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Pays
-- -----------------------------------------------------------------------------

insert into countries (code, name, name_ar, currency, phone_prefix, languages, is_active)
values
${valuesBlock(
  COUNTRIES.map((country) => [
    text(country.code),
    text(country.name),
    textOrNull(country.nameAr),
    text(country.currency),
    text(country.phonePrefix),
    textArray(country.languages),
    boolean(country.isActive),
  ]),
)}
on conflict (code) do update set
  name         = excluded.name,
  name_ar      = excluded.name_ar,
  currency     = excluded.currency,
  phone_prefix = excluded.phone_prefix,
  languages    = excluded.languages,
  is_active    = excluded.is_active;
`);

/* ---------- Villes ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Villes
-- -----------------------------------------------------------------------------

insert into cities (country_code, name, name_ar, slug, lat, lng, is_active)
values
${valuesBlock(
  CITIES.map((city) => [
    text(city.countryCode),
    text(city.name),
    textOrNull(city.nameAr),
    text(city.slug),
    decimal(city.lat),
    decimal(city.lng),
    boolean(city.isActive),
  ]),
)}
on conflict (country_code, slug) do update set
  name      = excluded.name,
  name_ar   = excluded.name_ar,
  lat       = excluded.lat,
  lng       = excluded.lng,
  is_active = excluded.is_active;
`);

/* ---------- Quartiers ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Quartiers
-- -----------------------------------------------------------------------------
-- ${NEIGHBORHOODS.length} quartiers de N'Djamena, couvrant les dix arrondissements.

insert into neighborhoods (city_id, name, slug, arrondissement)
select c.id, v.name, v.slug, v.arrondissement
from (
  values
${valuesBlock(
  NEIGHBORHOODS.map((neighborhood) => [
    text(neighborhood.citySlug),
    text(neighborhood.name),
    text(neighborhood.slug),
    integerOrNull(neighborhood.arrondissement),
  ]),
  '    ',
)}
) as v(city_slug, name, slug, arrondissement)
join cities c on c.slug = v.city_slug
on conflict (city_id, slug) do update set
  name           = excluded.name,
  arrondissement = excluded.arrondissement;
`);

/* ---------- Types de lieux ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Types de lieux
-- -----------------------------------------------------------------------------

insert into place_types (code, label_fr, label_ar, icon, sort_order)
values
${valuesBlock(
  PLACE_TYPES.map((placeType) => [
    text(placeType.code),
    text(placeType.labelFr),
    textOrNull(placeType.labelAr),
    text(placeType.icon),
    integerOrNull(placeType.sortOrder),
  ]),
)}
on conflict (code) do update set
  label_fr   = excluded.label_fr,
  label_ar   = excluded.label_ar,
  icon       = excluded.icon,
  sort_order = excluded.sort_order;
`);

/* ---------- Lieux ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Lieux nommés
-- -----------------------------------------------------------------------------
-- is_verified reste à false partout : passer un lieu à true est une décision métier,
-- elle engage son gestionnaire à tenir un registre des objets trouvés.

insert into places (city_id, neighborhood_id, place_type, name, slug, lat, lng, is_verified)
select c.id, n.id, v.place_type, v.name, v.slug, v.lat, v.lng, v.is_verified
from (
  values
${valuesBlock(
  PLACES.map((place) => [
    text(place.citySlug),
    text(place.neighborhoodSlug),
    text(place.placeType),
    text(place.name),
    text(place.slug),
    decimal(place.lat),
    decimal(place.lng),
    boolean(place.isVerified),
  ]),
  '    ',
)}
) as v(city_slug, neighborhood_slug, place_type, name, slug, lat, lng, is_verified)
join cities c on c.slug = v.city_slug
join neighborhoods n on n.slug = v.neighborhood_slug and n.city_id = c.id
on conflict (slug) do update set
  neighborhood_id = excluded.neighborhood_id,
  place_type      = excluded.place_type,
  name            = excluded.name,
  lat             = excluded.lat,
  lng             = excluded.lng,
  is_verified     = excluded.is_verified;
`);

/* ---------- Catégories racines ---------- */
const rootIds = new Set(ROOT_CATEGORIES.map((category) => category.id));

out.push(`-- -----------------------------------------------------------------------------
-- Catégories d'objets — racines
-- -----------------------------------------------------------------------------
-- Les six familles du lancement. Elles portent la classe tarifaire par défaut et,
-- pour « Documents & cartes », le caractère sensible qui déclenche le floutage.

insert into item_categories (
  parent_id, code, label_fr, label_ar, icon, default_class,
  min_value_xaf, max_value_xaf, is_sensitive, asks_declared_value, sort_order
)
values
${valuesBlock(
  CATEGORIES.filter((category) => rootIds.has(category.id)).map((category) => [
    'null',
    text(category.id),
    text(category.labelFr),
    textOrNull(category.labelAr),
    text(category.icon),
    `${text(category.defaultClass)}::pricing_class`,
    bigintOrNull(category.minValueXaf),
    bigintOrNull(category.maxValueXaf),
    boolean(category.isSensitive),
    boolean(category.asksDeclaredValue),
    integerOrNull(category.sortOrder),
  ]),
)}
on conflict (code) do update set
  label_fr            = excluded.label_fr,
  label_ar            = excluded.label_ar,
  icon                = excluded.icon,
  default_class       = excluded.default_class,
  min_value_xaf       = excluded.min_value_xaf,
  max_value_xaf       = excluded.max_value_xaf,
  is_sensitive        = excluded.is_sensitive,
  asks_declared_value = excluded.asks_declared_value,
  sort_order          = excluded.sort_order;
`);

/* ---------- Sous-catégories ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Catégories d'objets — sous-catégories
-- -----------------------------------------------------------------------------
-- Ce sont elles que l'utilisateur choisit réellement : elles portent la classe
-- tarifaire et le plafond de valeur au-delà duquel l'objet monte d'une classe.

insert into item_categories (
  parent_id, code, label_fr, label_ar, icon, default_class,
  min_value_xaf, max_value_xaf, is_sensitive, asks_declared_value, sort_order
)
select p.id, v.code, v.label_fr, v.label_ar, v.icon, v.default_class,
       v.min_value_xaf, v.max_value_xaf, v.is_sensitive, v.asks_declared_value, v.sort_order
from (
  values
${valuesBlock(
  CATEGORIES.filter((category) => !rootIds.has(category.id)).map((category) => [
    text(category.parentId ?? ''),
    text(category.id),
    text(category.labelFr),
    textOrNull(category.labelAr),
    text(category.icon),
    `${text(category.defaultClass)}::pricing_class`,
    bigintOrNull(category.minValueXaf),
    bigintOrNull(category.maxValueXaf),
    boolean(category.isSensitive),
    boolean(category.asksDeclaredValue),
    integerOrNull(category.sortOrder),
  ]),
  '    ',
)}
) as v(parent_code, code, label_fr, label_ar, icon, default_class,
       min_value_xaf, max_value_xaf, is_sensitive, asks_declared_value, sort_order)
join item_categories p on p.code = v.parent_code
on conflict (code) do update set
  parent_id           = excluded.parent_id,
  label_fr            = excluded.label_fr,
  label_ar            = excluded.label_ar,
  icon                = excluded.icon,
  default_class       = excluded.default_class,
  min_value_xaf       = excluded.min_value_xaf,
  max_value_xaf       = excluded.max_value_xaf,
  is_sensitive        = excluded.is_sensitive,
  asks_declared_value = excluded.asks_declared_value,
  sort_order          = excluded.sort_order;
`);

/* ---------- Types d'objets ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Types d'objets
-- -----------------------------------------------------------------------------
-- ${ITEM_TYPES.length} types. Chaque catégorie terminale en possède au moins un : sans
-- type d'objet, le signal « type » du moteur de correspondance plafonne à 0,60 et le
-- score maximal tombe à 88 sur 100, sous le seuil de 90 qui déclenche le niveau
-- « très probable ». Une catégorie sans type rendrait ses objets impossibles à notifier.

insert into item_types (category_id, code, label_fr, label_ar, default_class, keywords, sort_order)
select c.id, v.code, v.label_fr, v.label_ar, v.default_class, v.keywords, v.sort_order
from (
  values
${valuesBlock(
  ITEM_TYPES.map((itemType) => [
    text(itemType.categoryId),
    text(itemType.id),
    text(itemType.labelFr),
    textOrNull(itemType.labelAr),
    itemType.defaultClass === null
      ? 'null::pricing_class'
      : `${text(itemType.defaultClass)}::pricing_class`,
    textArray(itemType.keywords),
    integerOrNull(itemType.sortOrder),
  ]),
  '    ',
)}
) as v(category_code, code, label_fr, label_ar, default_class, keywords, sort_order)
join item_categories c on c.code = v.category_code
on conflict (category_id, code) do update set
  label_fr      = excluded.label_fr,
  label_ar      = excluded.label_ar,
  default_class = excluded.default_class,
  keywords      = excluded.keywords,
  sort_order    = excluded.sort_order;
`);

/* ---------- Questions de vérification ---------- */
out.push(`-- -----------------------------------------------------------------------------
-- Questions de vérification de propriété
-- -----------------------------------------------------------------------------
-- ${VERIFICATION_QUESTIONS.length} questions, rattachées aux catégories racines et héritées
-- par leurs sous-catégories.

insert into verification_questions (
  category_id, code, prompt_fr, answer_kind, choices, weight, is_required, sort_order
)
select c.id, v.code, v.prompt_fr, v.answer_kind, v.choices, v.weight, v.is_required, v.sort_order
from (
  values
${valuesBlock(
  VERIFICATION_QUESTIONS.map((question, index) => [
    text(question.categoryId),
    text(question.id),
    text(question.promptFr),
    text(question.answerKind),
    textArrayOrNull(question.choices),
    integerOrNull(question.weight),
    boolean(question.isRequired),
    integerOrNull((index + 1) * 10),
  ]),
  '    ',
)}
) as v(category_code, code, prompt_fr, answer_kind, choices, weight, is_required, sort_order)
join item_categories c on c.code = v.category_code
on conflict (category_id, code) do update set
  prompt_fr   = excluded.prompt_fr,
  answer_kind = excluded.answer_kind,
  choices     = excluded.choices,
  weight      = excluded.weight,
  is_required = excluded.is_required,
  sort_order  = excluded.sort_order;
`);

out.push(`-- -----------------------------------------------------------------------------
-- Contrôle final
-- -----------------------------------------------------------------------------
-- La contrainte différée sur les catégories terminales est vérifiée au commit.
-- Ces deux contrôles immédiats donnent un message lisible si le seed a été tronqué.

do $$
declare
  n_neighborhoods int;
  n_categories    int;
  n_item_types    int;
begin
  select count(*) into n_neighborhoods from neighborhoods;
  select count(*) into n_categories    from item_categories;
  select count(*) into n_item_types    from item_types;

  if n_neighborhoods < ${NEIGHBORHOODS.length} then
    raise exception 'Seed incomplet : % quartiers attendus, % présents.', ${NEIGHBORHOODS.length}, n_neighborhoods;
  end if;

  if n_categories < ${CATEGORIES.length} then
    raise exception 'Seed incomplet : % catégories attendues, % présentes.', ${CATEGORIES.length}, n_categories;
  end if;

  if n_item_types < ${ITEM_TYPES.length} then
    raise exception 'Seed incomplet : % types d''objets attendus, % présents.', ${ITEM_TYPES.length}, n_item_types;
  end if;
end
$$;

commit;
`);

/* -------------------------------------------------------------------------- */
/* Écriture du fichier                                                         */
/* -------------------------------------------------------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '..', 'supabase', 'seed.sql');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out.join('\n'), 'utf8');

const lineCount = out.join('\n').split('\n').length;
// eslint-disable-next-line no-console
console.log(
  `seed.sql généré : ${lineCount} lignes, ` +
    `${COUNTRIES.length} pays, ${CITIES.length} villes, ${NEIGHBORHOODS.length} quartiers, ` +
    `${PLACE_TYPES.length} types de lieux, ${PLACES.length} lieux, ` +
    `${CATEGORIES.length} catégories, ${ITEM_TYPES.length} types d'objets, ` +
    `${VERIFICATION_QUESTIONS.length} questions.`,
);
