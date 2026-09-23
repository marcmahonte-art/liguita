-- =============================================================================
-- Liguita — 0004 · Sécurité des référentiels (Row Level Security)
-- =============================================================================
-- Référence : docs/Liguita_Plan_Implementation_v3.md §11
--
-- Principe appliqué ici : **lecture publique, écriture interdite**.
--
-- Les référentiels sont la vitrine de la plateforme — une page d'accueil, une recherche
-- ou un formulaire de déclaration doivent fonctionner sans compte. Mais aucun client ne
-- doit pouvoir modifier une ville, un quartier ou une grille tarifaire.
--
-- Le mécanisme est volontairement minimal : on active RLS et on n'accorde QUE le SELECT.
-- En PostgreSQL, une table sous RLS sans politique d'INSERT/UPDATE/DELETE refuse ces
-- opérations par défaut. Il n'y a donc rien à écrire pour interdire l'écriture — et
-- c'est exactement ce qui rend la règle difficile à contourner par erreur.
--
-- Le rôle `service_role` (utilisé par les migrations, les workers et les route handlers
-- serveur) contourne RLS : c'est lui, et lui seul, qui peut écrire.
--
-- ⚠️ Un test d'intégration doit vérifier chacune de ces politiques avec trois profils :
-- anonyme, utilisateur authentifié, administrateur. Une politique non testée est une
-- politique dont on ne sait pas si elle s'applique.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Activation de RLS
-- -----------------------------------------------------------------------------

alter table countries        enable row level security;
alter table cities           enable row level security;
alter table neighborhoods    enable row level security;
alter table place_types      enable row level security;
alter table places           enable row level security;
alter table item_categories  enable row level security;
alter table item_types       enable row level security;
alter table pricing_rules    enable row level security;

-- Force RLS pour le propriétaire des tables également. Sans cela, le rôle qui a créé
-- les tables (souvent `postgres`) contournerait silencieusement les politiques lors
-- des tests, et l'on croirait la sécurité validée alors qu'elle ne l'est pas.
alter table countries        force row level security;
alter table cities           force row level security;
alter table neighborhoods    force row level security;
alter table place_types      force row level security;
alter table places           force row level security;
alter table item_categories  force row level security;
alter table item_types       force row level security;
alter table pricing_rules    force row level security;

-- -----------------------------------------------------------------------------
-- Privilèges de lecture
-- -----------------------------------------------------------------------------

grant select on
  countries, cities, neighborhoods, place_types, places, item_categories, item_types
to anon, authenticated;

grant select on pricing_rules to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Politiques de lecture
-- -----------------------------------------------------------------------------

-- Les référentiels géographiques et taxonomiques sont intégralement publics : ils ne
-- contiennent aucune donnée personnelle.
create policy countries_public_read on countries
  for select to anon, authenticated using (true);

create policy cities_public_read on cities
  for select to anon, authenticated using (is_active);

create policy neighborhoods_public_read on neighborhoods
  for select to anon, authenticated using (true);

create policy place_types_public_read on place_types
  for select to anon, authenticated using (true);

create policy places_public_read on places
  for select to anon, authenticated using (true);

create policy item_categories_public_read on item_categories
  for select to anon, authenticated using (true);

create policy item_types_public_read on item_types
  for select to anon, authenticated using (true);

-- Les grilles tarifaires : transparence totale sur la version appliquée, rien sur
-- l'historique. Un utilisateur n'a pas besoin de connaître les anciens tarifs, et
-- exposer les versions closes n'apporte rien.
create policy pricing_rules_public_read_active on pricing_rules
  for select to anon, authenticated using (is_active);
