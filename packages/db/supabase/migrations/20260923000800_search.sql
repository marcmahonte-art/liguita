-- =============================================================================
-- Liguita — 0008 · Recherche (Sprint 3)
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §4.6, §7.2, Sprint 3
--
-- 3.1  Vue `public_found_items` : seule surface exposée au grand public.
--      Elle ne contient aucune donnée personnelle (téléphone, nom, adresse,
--      description complète) conformément à la loi n° 007/PR/2015.
-- 3.2  Recherche plein texte `tsvector` + `pg_trgm` pour « carte » → « Carte
--      nationale » et la recherche floue sur les accents.
--
-- La vue s'appuie sur le schéma réel de `found_items` (0006), pas sur l'exemple
-- du plan qui référençait des colonnes (`public_ref`, `is_public`, `deleted_at`)
-- absentes de ce schéma.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.2 — Recherche plein texte (tsvector) sur found_items
-- -----------------------------------------------------------------------------

-- `unaccent()` est STABLE, pas IMMUTABLE : on passe par l'enveloppe créée en 0001.
-- `immutable_unaccent()` fige le dictionnaire et permet l'index GIN.
alter table found_items
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'french',
      coalesce(immutable_unaccent(title), '') || ' ' ||
      coalesce(immutable_unaccent(description), '') || ' ' ||
      coalesce(immutable_unaccent(brand), '') || ' ' ||
      coalesce(immutable_unaccent(color), '') || ' ' ||
      coalesce(immutable_unaccent(place_label), '')
    )
  ) stored;

create index if not exists found_items_search_idx
  on found_items using gin (search_vector);

-- Index trigramme sur description et place_label (title existe déjà en 0006).
create index if not exists found_items_description_trgm_idx
  on found_items using gin (description gin_trgm_ops);

create index if not exists found_items_place_label_trgm_idx
  on found_items using gin (place_label gin_trgm_ops);

-- Même chose pour lost_items : le propriétaire doit pouvoir retrouver sa
-- déclaration dans son espace, et le matching croisé utilise le même index.
alter table lost_items
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'french',
      coalesce(immutable_unaccent(title), '') || ' ' ||
      coalesce(immutable_unaccent(description), '') || ' ' ||
      coalesce(immutable_unaccent(brand), '') || ' ' ||
      coalesce(immutable_unaccent(color), '') || ' ' ||
      coalesce(immutable_unaccent(place_label), '')
    )
  ) stored;

create index if not exists lost_items_search_idx
  on lost_items using gin (search_vector);

create index if not exists lost_items_description_trgm_idx
  on lost_items using gin (description gin_trgm_ops);

create index if not exists lost_items_place_label_trgm_idx
  on lost_items using gin (place_label gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3.1 — Vue publique anonymisée `public_found_items`
-- -----------------------------------------------------------------------------
-- Seule surface lisible par le rôle `anon`. Les objets restent dans la table
-- `found_items` (RLS lecture pour tout le monde depuis 0006) ; la vue sert de
-- contrat d'anonymisation : elle ne projette QUE les colonnes autorisées.
--
-- Aucune colonne personnelle, aucune description complète, aucune coordonnée,
-- aucun identifiant de trouveur. La description est tronquée ; le texte complet
-- n'est jamais exposé.
--
-- `security_invoker = off` : la vue s'exécute avec les droits de son
-- propriétaire (postgres, qui contourne la RLS en tant que superuser), pas de
-- l'appelant. On restreint donc l'accès uniquement par GRANT ci-dessous : `anon`
-- ne reçoit SELECT que sur la vue, jamais sur `found_items`.

create or replace view public_found_items
with (security_invoker = off) as
select
  f.id,
  f.category_code,
  f.item_type_code,
  f.title,
  f.brand,
  f.color,
  f.city_slug,
  f.neighborhood_slug,
  f.place_label,
  f.found_at,
  f.status,
  f.created_at,
  -- Nombre de photos (pas les URLs, qui peuvent porter des métadonnées EXIF)
  (select count(*)::int
     from item_photos p
    where p.item_kind = 'FOUND' and p.item_id = f.id) as photo_count,
  -- Aperçu tronqué : 120 caractères max, jamais le texte intégral.
  case
    when f.description is null then null
    else left(immutable_unaccent(f.description), 120)
  end as description_preview
from found_items f
where f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED');

comment on view public_found_items is
  'Surface publique anonymisée des objets trouvés. Aucune donnée personnelle (loi n° 007/PR/2015).';

grant select on public_found_items to anon, authenticated, service_role;

-- Fermer l'accès direct de `anon` sur found_items (default privileges Supabase
-- ou grant antérieur) : toute lecture publique doit passer par la vue ou la RPC
-- anonymisées. `authenticated` garde SELECT (propriétaire et staff, RLS 0006).
revoke select on found_items from anon;

-- -----------------------------------------------------------------------------
-- Fonction RPC : recherche paginée par curseur
-- -----------------------------------------------------------------------------
-- Une seule fonction pour /rechercher et /objets-trouves. Retourne un JSON
-- contenant les items ANONYMISÉS + le curseur de la page suivante.
--
-- `p_limit` est borné (max 50) pour éviter un dump accidental de la table.
-- Le curseur est `(found_at, id)` : stable, pas d'OFFSET, compatible avec un
-- index sur `(found_at desc, id desc)`.
--
-- SECURITY DEFINER : la fonction s'exécute avec les droits de son propriétaire
-- (postgres) et n'a pas besoin d'un GRANT SELECT sur `found_items` pour `anon`
-- — ce qui laisserait une porte directe vers finder_id et la description
-- complète via PostgREST. L'anonymisation est portée par la projection de la
-- fonction (colonnes non-sensibles uniquement) et par la vue.
--
-- Ordre des grilles : sans curseur (première page), priorité au rang de
-- pertinence ; avec curseur, tri chronologique strict pour que la clé
-- `(found_at, id)` progresse sans doublon ni trou.

create or replace function public.search_found_items(
  p_query text default null,
  p_category_code text default null,
  p_city_slug text default null,
  p_neighborhood_slug text default null,
  p_item_type_code text default null,
  p_cursor_found_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table (
  id uuid,
  category_code text,
  item_type_code text,
  title text,
  brand text,
  color text,
  city_slug text,
  neighborhood_slug text,
  place_label text,
  found_at timestamptz,
  status item_status,
  created_at timestamptz,
  photo_count int,
  description_preview text,
  next_cursor_found_at timestamptz,
  next_cursor_id uuid
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  -- LIMIT ne peut pas référencer une variable en LANGUAGE sql : plpgsql le permet.
  v_lim int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  return query
  with normalized as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as q,
      nullif(btrim(coalesce(p_category_code, '')), '') as cat,
      nullif(btrim(coalesce(p_city_slug, '')), '') as city,
      nullif(btrim(coalesce(p_neighborhood_slug, '')), '') as hood,
      nullif(btrim(coalesce(p_item_type_code, '')), '') as itype,
      v_lim as lim
  ),
  ranked as (
    select
      f.id,
      f.category_code,
      f.item_type_code,
      f.title,
      f.brand,
      f.color,
      f.city_slug,
      f.neighborhood_slug,
      f.place_label,
      f.found_at,
      f.status,
      f.created_at,
      (
        select count(*)::int
          from item_photos p
         where p.item_kind = 'FOUND' and p.item_id = f.id
      ) as photo_count,
      case
        when f.description is null then null
        else left(immutable_unaccent(f.description), 120)
      end as description_preview,
      case
        when n.q is null then null
        else similarity(immutable_unaccent(f.title), n.q)
           + similarity(immutable_unaccent(coalesce(f.description, '')), n.q)
      end as trgm_score,
      case
        when n.q is null then null
        else ts_rank(f.search_vector, websearch_to_tsquery('french', n.q))
      end as fts_rank
    from found_items f
    cross join normalized n
    where f.status in ('FOUND', 'IN_INVENTORY', 'MATCH_POSSIBLE', 'OWNER_IDENTIFIED')
      and (n.cat is null or f.category_code = n.cat)
      and (n.city is null or f.city_slug = n.city)
      and (n.hood is null or f.neighborhood_slug = n.hood)
      and (n.itype is null or f.item_type_code = n.itype)
      and (
        n.q is null
        or f.search_vector @@ websearch_to_tsquery('french', n.q)
        or immutable_unaccent(f.title) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.description, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.brand, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(coalesce(f.color, '')) % immutable_unaccent(n.q)
        or immutable_unaccent(f.place_label) % immutable_unaccent(n.q)
        or immutable_unaccent(f.title) ilike '%' || immutable_unaccent(n.q) || '%'
        or immutable_unaccent(coalesce(f.description, '')) ilike '%' || immutable_unaccent(n.q) || '%'
      )
      and (
        p_cursor_found_at is null or p_cursor_id is null
        or (f.found_at, f.id) < (p_cursor_found_at, p_cursor_id)
      )
  ),
  -- Une ligne de plus que la page demandée : si elle revient, il existe une suite.
  -- L'ordre est porté par le RANGE de row_number() : les fenêtres sont évaluées
  -- avant ORDER BY, sans quoi rn ne correspondrait pas à l'ordre de restitution.
  page as (
    select
      r.*,
      row_number() over (
        order by
          case
            when p_cursor_found_at is null and r.fts_rank is not null
              then r.fts_rank
            else 0
          end desc,
          case
            when p_cursor_found_at is null and r.trgm_score is not null
              then r.trgm_score
            else 0
          end desc,
          r.found_at desc,
          r.id desc
      ) as rn,
      count(*) over () as fetched
    from ranked r
  )
  select
    p.id,
    p.category_code,
    p.item_type_code,
    p.title,
    p.brand,
    p.color,
    p.city_slug,
    p.neighborhood_slug,
    p.place_label,
    p.found_at,
    p.status,
    p.created_at,
    p.photo_count,
    p.description_preview,
    -- Curseur commun à toute la page : (found_at, id) du dernier renvoyé.
    case
      when p.fetched > v_lim
      then (select lr.found_at from page lr where lr.rn = v_lim)
    end as next_cursor_found_at,
    case
      when p.fetched > v_lim
      then (select lr.id from page lr where lr.rn = v_lim)
    end as next_cursor_id
  from page p
  where p.rn <= v_lim
  order by p.rn;
end;
$$;

comment on function public.search_found_items(text, text, text, text, text, timestamptz, uuid, int) is
  'Recherche paginée par curseur sur les objets trouvés. SECURITY DEFINER, sortie anonymisée. Aucune donnée personnelle.';

-- Exécution explicite pour les rôles de l'API (PostgREST) ; retrait du grant
-- PUBLIC hérité de PostgreSQL pour ne pas exposer la fonction à d'autres rôles.
revoke execute on function public.search_found_items(text, text, text, text, text, timestamptz, uuid, int) from public;
grant execute on function public.search_found_items(text, text, text, text, text, timestamptz, uuid, int)
  to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Index de pagination clé (found_at, id) — évite le OFFSET
-- -----------------------------------------------------------------------------
create index if not exists found_items_found_at_id_idx
  on found_items (found_at desc, id desc);

-- -----------------------------------------------------------------------------
-- Trigger de purge des search_vector n'est pas nécessaire : GENERATED ALWAYS
-- se met à jour automatiquement à chaque INSERT/UPDATE de title/description/...
-- -----------------------------------------------------------------------------
