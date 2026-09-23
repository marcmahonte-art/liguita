-- =============================================================================
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
-- Ce seed est idempotent : chaque insertion porte un `on conflict ... do update` sur sa
-- clé naturelle. Le rejouer met à jour les libellés sans créer de doublon.
--
-- Le seed s'exécute en une seule transaction (comportement de `supabase db reset`), ce
-- qui est indispensable : la contrainte différée qui exige un type d'objet par catégorie
-- terminale n'est vérifiée qu'à la validation, après que les deux tables sont peuplées.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Pays
-- -----------------------------------------------------------------------------

insert into countries (code, name, name_ar, currency, phone_prefix, languages, is_active)
values
  ('TD', 'Tchad', 'تشاد', 'XAF', '+235', array['fr', 'ar']::text[], true),
  ('CM', 'Cameroun', null::text, 'XAF', '+237', array['fr', 'en']::text[], false),
  ('NE', 'Niger', null::text, 'XOF', '+227', array['fr']::text[], false),
  ('NG', 'Nigeria', null::text, 'NGN', '+234', array['en']::text[], false),
  ('SD', 'Soudan', null::text, 'SDG', '+249', array['ar', 'en']::text[], false),
  ('LY', 'Libye', null::text, 'LYD', '+218', array['ar']::text[], false),
  ('CF', 'République centrafricaine', null::text, 'XAF', '+236', array['fr', 'sg']::text[], false)
on conflict (code) do update set
  name         = excluded.name,
  name_ar      = excluded.name_ar,
  currency     = excluded.currency,
  phone_prefix = excluded.phone_prefix,
  languages    = excluded.languages,
  is_active    = excluded.is_active;

-- -----------------------------------------------------------------------------
-- Villes
-- -----------------------------------------------------------------------------

insert into cities (country_code, name, name_ar, slug, lat, lng, is_active)
values
  ('TD', 'N''Djamena', 'انجمينا', 'ndjamena', 12.134800::numeric(9,6), 15.055700::numeric(9,6), true),
  ('TD', 'Moundou', null::text, 'moundou', 8.566700::numeric(9,6), 16.083300::numeric(9,6), true),
  ('TD', 'Abéché', null::text, 'abeche', 13.829200::numeric(9,6), 20.832400::numeric(9,6), true),
  ('TD', 'Sarh', null::text, 'sarh', 9.142900::numeric(9,6), 18.392300::numeric(9,6), true),
  ('TD', 'Bongor', null::text, 'bongor', 10.280600::numeric(9,6), 15.372200::numeric(9,6), false),
  ('TD', 'Mongo', null::text, 'mongo', 12.184400::numeric(9,6), 18.693100::numeric(9,6), false)
on conflict (country_code, slug) do update set
  name      = excluded.name,
  name_ar   = excluded.name_ar,
  lat       = excluded.lat,
  lng       = excluded.lng,
  is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- Quartiers
-- -----------------------------------------------------------------------------
-- 22 quartiers de N'Djamena, couvrant les dix arrondissements.

insert into neighborhoods (city_id, name, slug, arrondissement)
select c.id, v.name, v.slug, v.arrondissement
from (
  values
    ('ndjamena', 'Moursal', 'moursal', 1::int),
    ('ndjamena', 'Farcha', 'farcha', 1::int),
    ('ndjamena', 'Gardolé', 'gardole', 1::int),
    ('ndjamena', 'Chagoua', 'chagoua', 2::int),
    ('ndjamena', 'Klemat', 'klemat', 2::int),
    ('ndjamena', 'Mardjandaffack', 'mardjandaffack', 3::int),
    ('ndjamena', 'Paris Congo', 'paris-congo', 4::int),
    ('ndjamena', 'Ambatta', 'ambatta', 4::int),
    ('ndjamena', 'Sabangali', 'sabangali', 5::int),
    ('ndjamena', 'Ridina', 'ridina', 5::int),
    ('ndjamena', 'Dembé', 'dembe', 6::int),
    ('ndjamena', 'Gassi', 'gassi', 7::int),
    ('ndjamena', 'Atrone', 'atrone', 7::int),
    ('ndjamena', 'Amriguébé', 'amriguebe', 8::int),
    ('ndjamena', 'Djambalbarh', 'djambalbarh', 8::int),
    ('ndjamena', 'Diguel', 'diguel', 9::int),
    ('ndjamena', 'Ndjari', 'ndjari', 9::int),
    ('ndjamena', 'Bololo', 'bololo', 9::int),
    ('ndjamena', 'Toukra', 'toukra', 9::int),
    ('ndjamena', 'Walia', 'walia', 9::int),
    ('ndjamena', 'Habena', 'habena', 10::int),
    ('ndjamena', 'Gozator', 'gozator', 10::int)
) as v(city_slug, name, slug, arrondissement)
join cities c on c.slug = v.city_slug
on conflict (city_id, slug) do update set
  name           = excluded.name,
  arrondissement = excluded.arrondissement;

-- -----------------------------------------------------------------------------
-- Types de lieux
-- -----------------------------------------------------------------------------

insert into place_types (code, label_fr, label_ar, icon, sort_order)
values
  ('market', 'Marché', 'سوق', 'storefront', 10::int),
  ('taxi', 'Taxi', null::text, 'car', 20::int),
  ('bus_station', 'Gare routière', null::text, 'bus', 30::int),
  ('airport', 'Aéroport', null::text, 'plane', 40::int),
  ('school', 'École ou université', null::text, 'school', 50::int),
  ('hospital', 'Hôpital ou centre de santé', null::text, 'hospital', 60::int),
  ('administration', 'Administration', null::text, 'building', 70::int),
  ('bank', 'Banque ou bureau de change', null::text, 'bank', 80::int),
  ('mosque', 'Mosquée', 'مسجد', 'mosque', 90::int),
  ('church', 'Église', null::text, 'church', 100::int),
  ('hotel', 'Hôtel', null::text, 'bed', 110::int),
  ('restaurant', 'Restaurant ou salon de thé', null::text, 'utensils', 120::int),
  ('shop', 'Boutique ou supermarché', null::text, 'cart', 130::int),
  ('stadium', 'Stade ou terrain de sport', null::text, 'ball', 140::int),
  ('street', 'Rue ou carrefour', null::text, 'road', 150::int),
  ('other', 'Autre lieu', null::text, 'pin', 999::int)
on conflict (code) do update set
  label_fr   = excluded.label_fr,
  label_ar   = excluded.label_ar,
  icon       = excluded.icon,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Lieux nommés
-- -----------------------------------------------------------------------------
-- is_verified reste à false partout : passer un lieu à true est une décision métier,
-- elle engage son gestionnaire à tenir un registre des objets trouvés.

insert into places (city_id, neighborhood_id, place_type, name, slug, lat, lng, is_verified)
select c.id, n.id, v.place_type, v.name, v.slug, v.lat, v.lng, v.is_verified
from (
  values
    ('ndjamena', 'farcha', 'airport', 'Aéroport International Hassan Djamous', 'aeroport-hassan-djamous', 12.133700::numeric(9,6), 15.034000::numeric(9,6), false),
    ('ndjamena', 'moursal', 'bus_station', 'Gare routière centrale', 'gare-routiere-centrale', 12.106400::numeric(9,6), 15.045500::numeric(9,6), false),
    ('ndjamena', 'moursal', 'bus_station', 'Gare de Moursal', 'gare-de-moursal', 12.101700::numeric(9,6), 15.039200::numeric(9,6), false),
    ('ndjamena', 'chagoua', 'market', 'Grand marché central', 'marche-central', 12.110600::numeric(9,6), 15.049100::numeric(9,6), false),
    ('ndjamena', 'dembe', 'market', 'Marché de Dembé', 'marche-de-dembe', 12.129800::numeric(9,6), 15.087200::numeric(9,6), false),
    ('ndjamena', 'moursal', 'market', 'Marché de Moursal', 'marche-de-moursal', 12.103100::numeric(9,6), 15.042400::numeric(9,6), false),
    ('ndjamena', 'chagoua', 'market', 'Marché de Chagoua', 'marche-de-chagoua', 12.103800::numeric(9,6), 15.067200::numeric(9,6), false),
    ('ndjamena', 'paris-congo', 'hospital', 'Hôpital général de référence nationale', 'hopital-general-de-reference', 12.113300::numeric(9,6), 15.061600::numeric(9,6), false),
    ('ndjamena', 'chagoua', 'hospital', 'Hôpital de la Mère et de l''Enfant', 'hopital-mere-et-enfant', 12.101500::numeric(9,6), 15.065200::numeric(9,6), false),
    ('ndjamena', 'ridina', 'hospital', 'CHU la Renaissance', 'chu-la-renaissance', 12.118600::numeric(9,6), 15.081300::numeric(9,6), false),
    ('ndjamena', 'ndjari', 'school', 'Université de N’Djamena', 'universite-de-ndjamena', 12.115800::numeric(9,6), 15.108500::numeric(9,6), false),
    ('ndjamena', 'ambatta', 'school', 'Lycée Félix Éboué', 'lycee-felix-eboue', 12.114500::numeric(9,6), 15.051800::numeric(9,6), false),
    ('ndjamena', 'sabangali', 'administration', 'Palais du 15', 'palais-du-15', 12.109700::numeric(9,6), 15.043600::numeric(9,6), false),
    ('ndjamena', 'sabangali', 'administration', 'Poste centrale', 'poste-centrale', 12.111900::numeric(9,6), 15.046400::numeric(9,6), false),
    ('ndjamena', 'sabangali', 'bank', 'Banque des États de l''Afrique Centrale', 'beac-ndjamena', 12.109300::numeric(9,6), 15.050700::numeric(9,6), false),
    ('ndjamena', 'klemat', 'mosque', 'Grande mosquée de N’Djamena', 'grande-mosquee-de-ndjamena', 12.108600::numeric(9,6), 15.044400::numeric(9,6), false),
    ('ndjamena', 'klemat', 'church', 'Cathédrale Notre-Dame de N’Djamena', 'cathedrale-notre-dame', 12.107500::numeric(9,6), 15.043200::numeric(9,6), false),
    ('ndjamena', 'chagoua', 'stadium', 'Stade Idriss Mahamat Ouya', 'stade-idriss-mahamat-ouya', 12.103200::numeric(9,6), 15.057900::numeric(9,6), false),
    ('ndjamena', 'paris-congo', 'shop', 'Supermarché Score', 'supermarche-score', 12.116100::numeric(9,6), 15.051200::numeric(9,6), false),
    ('ndjamena', 'farcha', 'hotel', 'Hôtel N’Djamena (ex-Kempinski)', 'hotel-kempinski-ndjamena', 12.124700::numeric(9,6), 15.045700::numeric(9,6), false)
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

-- -----------------------------------------------------------------------------
-- Catégories d'objets — racines
-- -----------------------------------------------------------------------------
-- Les six familles du lancement. Elles portent la classe tarifaire par défaut et,
-- pour « Documents & cartes », le caractère sensible qui déclenche le floutage.

insert into item_categories (
  parent_id, code, label_fr, label_ar, icon, default_class,
  min_value_xaf, max_value_xaf, is_sensitive, asks_declared_value, sort_order
)
values
  (null, 'documents', 'Documents & cartes', 'وثائق', 'id-card', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 10::int),
  (null, 'personal', 'Effets personnels', null::text, 'bag', 'C2'::pricing_class, null::bigint, null::bigint, false, true, 20::int),
  (null, 'electronics', 'Électronique', null::text, 'phone', 'C3'::pricing_class, null::bigint, null::bigint, false, true, 30::int),
  (null, 'valuables', 'Objets de valeur', null::text, 'gem', 'C4'::pricing_class, null::bigint, null::bigint, false, true, 40::int),
  (null, 'special', 'Cas spéciaux', null::text, 'truck', 'C5'::pricing_class, null::bigint, null::bigint, false, true, 50::int),
  (null, 'other', 'Divers', null::text, 'box', 'C2'::pricing_class, null::bigint, null::bigint, false, true, 60::int)
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

-- -----------------------------------------------------------------------------
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
    ('documents', 'id-card', 'Carte nationale d''identité', null::text, 'id-card', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 10::int),
    ('documents', 'passport', 'Passeport', null::text, 'id-card', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 20::int),
    ('documents', 'driver-license', 'Permis de conduire', null::text, 'id-card', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 30::int),
    ('documents', 'diploma', 'Diplôme ou relevé de notes', null::text, 'scroll', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 40::int),
    ('documents', 'student-card', 'Carte d''étudiant', null::text, 'id-card', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 50::int),
    ('documents', 'health-book', 'Carnet de santé', null::text, 'heart-pulse', 'C1'::pricing_class, null::bigint, null::bigint, true, false, 60::int),
    ('personal', 'wallet', 'Portefeuille', null::text, 'wallet', 'C2'::pricing_class, null::bigint, 150000::bigint, false, true, 10::int),
    ('personal', 'bag', 'Sac ou sacoche', null::text, 'bag', 'C2'::pricing_class, null::bigint, 200000::bigint, false, true, 20::int),
    ('personal', 'keys', 'Clés', null::text, 'key', 'C2'::pricing_class, null::bigint, 20000::bigint, false, false, 30::int),
    ('personal', 'glasses', 'Lunettes', null::text, 'glasses', 'C2'::pricing_class, null::bigint, 100000::bigint, false, true, 40::int),
    ('personal', 'clothes', 'Vêtements', null::text, 'shirt', 'C2'::pricing_class, null::bigint, 100000::bigint, false, true, 50::int),
    ('personal', 'books', 'Livres et fournitures', null::text, 'book', 'C2'::pricing_class, null::bigint, 50000::bigint, false, true, 60::int),
    ('personal', 'fashion-jewelry', 'Bijoux fantaisie', null::text, 'gem', 'C2'::pricing_class, null::bigint, 50000::bigint, false, true, 70::int),
    ('electronics', 'phone', 'Téléphone entrée ou milieu de gamme', null::text, 'phone', 'C3'::pricing_class, null::bigint, 200000::bigint, false, true, 10::int),
    ('electronics', 'tablet', 'Tablette', null::text, 'tablet', 'C3'::pricing_class, null::bigint, 300000::bigint, false, true, 20::int),
    ('electronics', 'laptop', 'Ordinateur portable', null::text, 'laptop', 'C3'::pricing_class, null::bigint, 600000::bigint, false, true, 30::int),
    ('electronics', 'headphones', 'Écouteurs ou casque', null::text, 'headphones', 'C3'::pricing_class, null::bigint, 100000::bigint, false, true, 40::int),
    ('electronics', 'smartwatch', 'Montre connectée', null::text, 'watch', 'C3'::pricing_class, null::bigint, 250000::bigint, false, true, 50::int),
    ('electronics', 'camera', 'Appareil photo', null::text, 'camera', 'C3'::pricing_class, null::bigint, 400000::bigint, false, true, 60::int),
    ('electronics', 'bicycle', 'Vélo', null::text, 'bike', 'C3'::pricing_class, null::bigint, 250000::bigint, false, true, 70::int),
    ('valuables', 'smartphone-premium', 'Smartphone haut de gamme', null::text, 'phone', 'C4'::pricing_class, 200000::bigint, 900000::bigint, false, true, 10::int),
    ('valuables', 'precious-jewelry', 'Bijoux précieux', null::text, 'gem', 'C4'::pricing_class, 200000::bigint, 1000000::bigint, false, true, 20::int),
    ('valuables', 'designer-bag', 'Sac de marque', null::text, 'bag', 'C4'::pricing_class, 200000::bigint, 800000::bigint, false, true, 30::int),
    ('valuables', 'pro-equipment', 'Matériel professionnel', null::text, 'tool', 'C4'::pricing_class, 200000::bigint, 1000000::bigint, false, true, 40::int),
    ('valuables', 'instrument', 'Instrument de musique', null::text, 'music', 'C4'::pricing_class, 200000::bigint, 700000::bigint, false, true, 50::int),
    ('special', 'vehicle', 'Véhicule ou engin', null::text, 'truck', 'C5'::pricing_class, 1000000::bigint, null::bigint, false, true, 10::int),
    ('special', 'business-lot', 'Lot d''entreprise ou de fret', null::text, 'package', 'C5'::pricing_class, null::bigint, null::bigint, false, true, 20::int),
    ('other', 'other-item', 'Autre objet', null::text, 'box', 'C2'::pricing_class, null::bigint, null::bigint, false, true, 10::int)
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

-- -----------------------------------------------------------------------------
-- Types d'objets
-- -----------------------------------------------------------------------------
-- 73 types. Chaque catégorie terminale en possède au moins un : sans
-- type d'objet, le signal « type » du moteur de correspondance plafonne à 0,60 et le
-- score maximal tombe à 88 sur 100, sous le seuil de 90 qui déclenche le niveau
-- « très probable ». Une catégorie sans type rendrait ses objets impossibles à notifier.

insert into item_types (category_id, code, label_fr, label_ar, default_class, keywords, sort_order)
select c.id, v.code, v.label_fr, v.label_ar, v.default_class, v.keywords, v.sort_order
from (
  values
    ('id-card', 'cni-biometric', 'Carte d’identité biométrique', null::text, null::pricing_class, array['cni', 'biometrique', 'ceama']::text[], 10::int),
    ('id-card', 'cni-paper', 'Carte d’identité ancienne (cartonnée)', null::text, null::pricing_class, array['cni', 'cartonnee', 'ancienne']::text[], 20::int),
    ('passport', 'passport-ordinary', 'Passeport ordinaire', null::text, null::pricing_class, array['passeport']::text[], 10::int),
    ('passport', 'passport-service', 'Passeport de service ou diplomatique', null::text, null::pricing_class, array['passeport', 'diplomatique', 'service']::text[], 20::int),
    ('driver-license', 'license-heavy', 'Permis poids lourd (C, D, E)', null::text, null::pricing_class, array['permis', 'poids lourd']::text[], 10::int),
    ('driver-license', 'license-light', 'Permis léger (A, B)', null::text, null::pricing_class, array['permis', 'voiture', 'moto']::text[], 20::int),
    ('diploma', 'diploma-certificate', 'Attestation ou certificat', null::text, null::pricing_class, array['attestation', 'certificat']::text[], 10::int),
    ('diploma', 'diploma-degree', 'Diplôme universitaire', null::text, null::pricing_class, array['diplome', 'licence', 'master']::text[], 20::int),
    ('diploma', 'diploma-transcript', 'Relevé de notes', null::text, null::pricing_class, array['releve', 'notes', 'bulletin']::text[], 30::int),
    ('student-card', 'student-card-school', 'Carte scolaire', null::text, null::pricing_class, array['scolaire', 'eleve']::text[], 10::int),
    ('student-card', 'student-card-university', 'Carte universitaire', null::text, null::pricing_class, array['universitaire', 'etudiant']::text[], 20::int),
    ('health-book', 'health-book-child', 'Carnet de santé enfant', null::text, null::pricing_class, array['carnet', 'enfant', 'vaccination']::text[], 10::int),
    ('health-book', 'health-book-adult', 'Carnet de santé adulte', null::text, null::pricing_class, array['carnet', 'adulte', 'medical']::text[], 20::int),
    ('wallet', 'wallet-fabric', 'Portefeuille en tissu', null::text, null::pricing_class, array['portefeuille', 'tissu']::text[], 10::int),
    ('wallet', 'wallet-leather', 'Portefeuille en cuir', null::text, null::pricing_class, array['portefeuille', 'cuir']::text[], 20::int),
    ('wallet', 'wallet-pouch', 'Bourse ou pochette', null::text, null::pricing_class, array['bourse', 'pochette']::text[], 30::int),
    ('bag', 'bag-backpack', 'Sac à dos', null::text, null::pricing_class, array['sac a dos', 'cartable']::text[], 10::int),
    ('bag', 'bag-briefcase', 'Serviette ou porte-documents', null::text, null::pricing_class, array['serviette', 'porte documents']::text[], 20::int),
    ('bag', 'bag-handbag', 'Sac à main', null::text, null::pricing_class, array['sac a main']::text[], 30::int),
    ('bag', 'bag-plastic', 'Sac en plastique ou sachet', null::text, null::pricing_class, array['sachet', 'plastique']::text[], 40::int),
    ('bag', 'bag-sport', 'Sac de sport ou de voyage', null::text, null::pricing_class, array['sport', 'voyage']::text[], 50::int),
    ('keys', 'keys-bunch', 'Trousseau de clés', null::text, null::pricing_class, array['trousseau', 'cles']::text[], 10::int),
    ('keys', 'keys-car', 'Clé de véhicule', null::text, null::pricing_class, array['cle', 'voiture', 'moto']::text[], 20::int),
    ('keys', 'keys-house', 'Clé de maison ou de porte', null::text, null::pricing_class, array['cle', 'maison', 'porte']::text[], 30::int),
    ('glasses', 'glasses-eyeglasses', 'Lunettes de vue', null::text, null::pricing_class, array['lunettes', 'vue']::text[], 10::int),
    ('glasses', 'glasses-sunglasses', 'Lunettes de soleil', null::text, null::pricing_class, array['lunettes', 'soleil']::text[], 20::int),
    ('clothes', 'clothes-dress', 'Robe ou ensemble', null::text, null::pricing_class, array['robe', 'ensemble', 'boubou']::text[], 10::int),
    ('clothes', 'clothes-jacket', 'Veste ou manteau', null::text, null::pricing_class, array['veste', 'manteau']::text[], 20::int),
    ('clothes', 'clothes-shirt', 'Chemise ou t-shirt', null::text, null::pricing_class, array['chemise', 'tshirt', 'polo']::text[], 30::int),
    ('clothes', 'clothes-shoes', 'Chaussures', null::text, null::pricing_class, array['chaussures', 'sandales']::text[], 40::int),
    ('clothes', 'clothes-trousers', 'Pantalon', null::text, null::pricing_class, array['pantalon', 'jean']::text[], 50::int),
    ('clothes', 'clothes-veil', 'Voile ou foulard', null::text, null::pricing_class, array['voile', 'foulard', 'hijab']::text[], 60::int),
    ('books', 'books-holy', 'Livre saint (Coran, Bible)', null::text, null::pricing_class, array['coran', 'bible', 'livre saint']::text[], 10::int),
    ('books', 'books-notebook', 'Cahier ou carnet', null::text, null::pricing_class, array['cahier', 'carnet']::text[], 20::int),
    ('books', 'books-textbook', 'Manuel scolaire', null::text, null::pricing_class, array['manuel', 'scolaire', 'livre']::text[], 30::int),
    ('fashion-jewelry', 'fashion-bracelet', 'Bracelet', null::text, null::pricing_class, array['bracelet']::text[], 10::int),
    ('fashion-jewelry', 'fashion-necklace', 'Collier', null::text, null::pricing_class, array['collier']::text[], 20::int),
    ('fashion-jewelry', 'fashion-ring', 'Bague ou boucles d’oreilles', null::text, null::pricing_class, array['bague', 'boucles']::text[], 30::int),
    ('phone', 'phone-feature', 'Téléphone à touches', null::text, null::pricing_class, array['touches', 'basique', 'tecno', 'itel']::text[], 10::int),
    ('phone', 'phone-smartphone', 'Smartphone', null::text, null::pricing_class, array['smartphone', 'android', 'tactile']::text[], 20::int),
    ('tablet', 'tablet-android', 'Tablette Android', null::text, null::pricing_class, array['tablette', 'android']::text[], 10::int),
    ('tablet', 'tablet-ipad', 'iPad', null::text, null::pricing_class, array['ipad', 'apple']::text[], 20::int),
    ('laptop', 'laptop-macbook', 'MacBook', null::text, null::pricing_class, array['macbook', 'apple']::text[], 10::int),
    ('laptop', 'laptop-windows', 'Ordinateur Windows', null::text, null::pricing_class, array['ordinateur', 'windows', 'hp', 'dell', 'lenovo']::text[], 20::int),
    ('headphones', 'headphones-earbuds', 'Écouteurs sans fil', null::text, null::pricing_class, array['ecouteurs', 'bluetooth', 'airpods']::text[], 10::int),
    ('headphones', 'headphones-over-ear', 'Casque audio', null::text, null::pricing_class, array['casque', 'audio']::text[], 20::int),
    ('smartwatch', 'smartwatch-apple', 'Apple Watch', null::text, null::pricing_class, array['apple watch']::text[], 10::int),
    ('smartwatch', 'smartwatch-android', 'Montre connectée Android', null::text, null::pricing_class, array['montre', 'connectee']::text[], 20::int),
    ('camera', 'camera-compact', 'Appareil photo compact', null::text, null::pricing_class, array['appareil photo', 'compact']::text[], 10::int),
    ('camera', 'camera-reflex', 'Appareil photo reflex', null::text, null::pricing_class, array['reflex', 'canon', 'nikon']::text[], 20::int),
    ('bicycle', 'bicycle-child', 'Vélo d’enfant', null::text, null::pricing_class, array['velo', 'enfant']::text[], 10::int),
    ('bicycle', 'bicycle-city', 'Vélo de ville', null::text, null::pricing_class, array['velo', 'ville']::text[], 20::int),
    ('bicycle', 'bicycle-mountain', 'Vélo tout-terrain', null::text, null::pricing_class, array['velo', 'vtt']::text[], 30::int),
    ('smartphone-premium', 'phone-iphone', 'iPhone', null::text, null::pricing_class, array['iphone', 'apple']::text[], 10::int),
    ('smartphone-premium', 'phone-premium-android', 'Smartphone Android haut de gamme', null::text, null::pricing_class, array['samsung', 'galaxy', 'tecno camon', 'premium']::text[], 20::int),
    ('precious-jewelry', 'jewelry-gold', 'Bijou en or', null::text, null::pricing_class, array['or', 'gold']::text[], 10::int),
    ('precious-jewelry', 'jewelry-silver', 'Bijou en argent', null::text, null::pricing_class, array['argent', 'silver']::text[], 20::int),
    ('precious-jewelry', 'jewelry-stone', 'Bijou avec pierre', null::text, null::pricing_class, array['pierre', 'diamant', 'perle']::text[], 30::int),
    ('designer-bag', 'bag-designer', 'Sac de marque', null::text, null::pricing_class, array['marque', 'luxe']::text[], 10::int),
    ('pro-equipment', 'pro-instrument', 'Instrument professionnel', null::text, null::pricing_class, array['instrument', 'professionnel']::text[], 10::int),
    ('pro-equipment', 'pro-machine', 'Machine ou moteur', null::text, null::pricing_class, array['machine', 'moteur', 'groupe electrogene']::text[], 20::int),
    ('pro-equipment', 'pro-tool', 'Outillage', null::text, null::pricing_class, array['outil', 'outillage']::text[], 30::int),
    ('instrument', 'instrument-guitar', 'Guitare', null::text, null::pricing_class, array['guitare']::text[], 10::int),
    ('instrument', 'instrument-percussion', 'Instrument à percussion', null::text, null::pricing_class, array['tam-tam', 'djembé', 'percussion']::text[], 20::int),
    ('instrument', 'instrument-wind', 'Instrument à vent', null::text, null::pricing_class, array['flute', 'trompette', 'vent']::text[], 30::int),
    ('vehicle', 'vehicle-car', 'Voiture', null::text, null::pricing_class, array['voiture', 'automobile']::text[], 10::int),
    ('vehicle', 'vehicle-motorcycle', 'Moto ou scooter', null::text, null::pricing_class, array['moto', 'scooter']::text[], 20::int),
    ('vehicle', 'vehicle-tricycle', 'Tricycle ou pousse-pousse', null::text, null::pricing_class, array['tricycle', 'pousse pousse', 'keke']::text[], 30::int),
    ('vehicle', 'vehicle-truck', 'Camion ou camionnette', null::text, null::pricing_class, array['camion', 'camionnette']::text[], 40::int),
    ('business-lot', 'lot-equipment', 'Lot de matériel', null::text, null::pricing_class, array['materiel', 'lot']::text[], 10::int),
    ('business-lot', 'lot-freight', 'Colis ou fret', null::text, null::pricing_class, array['colis', 'fret']::text[], 20::int),
    ('business-lot', 'lot-merchandise', 'Lot de marchandises', null::text, null::pricing_class, array['marchandises', 'stock']::text[], 30::int),
    ('other-item', 'other-unknown', 'Objet non identifié', null::text, null::pricing_class, array[]::text[], 10::int)
) as v(category_code, code, label_fr, label_ar, default_class, keywords, sort_order)
join item_categories c on c.code = v.category_code
on conflict (category_id, code) do update set
  label_fr      = excluded.label_fr,
  label_ar      = excluded.label_ar,
  default_class = excluded.default_class,
  keywords      = excluded.keywords,
  sort_order    = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Questions de vérification de propriété
-- -----------------------------------------------------------------------------
-- 29 questions, rattachées aux catégories racines et héritées
-- par leurs sous-catégories.

insert into verification_questions (
  category_id, code, prompt_fr, answer_kind, choices, weight, is_required, sort_order
)
select c.id, v.code, v.prompt_fr, v.answer_kind, v.choices, v.weight, v.is_required, v.sort_order
from (
  values
    ('documents', 'doc-name', 'Quel est le nom complet inscrit sur le document ?', 'text', null::text[], 3::int, true, 10::int),
    ('documents', 'doc-birthdate', 'Quelle est la date de naissance figurant sur le document ?', 'date', null::text[], 3::int, true, 20::int),
    ('documents', 'doc-number-tail', 'Quels sont les quatre derniers caractères du numéro du document ?', 'text', null::text[], 4::int, true, 30::int),
    ('documents', 'doc-issued-by', 'Par quel service ou dans quelle ville le document a-t-il été délivré ?', 'text', null::text[], 2::int, false, 40::int),
    ('documents', 'doc-kept-with', 'Y avait-il d’autres papiers rangés avec ce document ? Lesquels ?', 'text', null::text[], 1::int, false, 50::int),
    ('personal', 'pers-contents', 'Décrivez le contenu qui se trouvait à l’intérieur.', 'text', null::text[], 4::int, true, 60::int),
    ('personal', 'pers-mark', 'Y a-t-il un signe distinctif visible (rayure, tache, autocollant, réparation) ?', 'text', null::text[], 3::int, true, 70::int),
    ('personal', 'pers-brand', 'Quelle marque ou inscription est visible sur l’objet ?', 'text', null::text[], 2::int, false, 80::int),
    ('personal', 'pers-color', 'Quelle est la couleur dominante de l’objet ?', 'text', null::text[], 2::int, true, 90::int),
    ('personal', 'pers-count', 'Combien d’éléments compose l’objet (compartiments, clés, pièces) ?', 'number', null::text[], 2::int, false, 100::int),
    ('electronics', 'elec-model', 'Quelle est la marque et le modèle exact ?', 'text', null::text[], 3::int, true, 110::int),
    ('electronics', 'elec-lock-first', 'Quel est le premier chiffre du code de déverrouillage ?', 'number', null::text[], 3::int, false, 120::int),
    ('electronics', 'elec-wallpaper', 'Décrivez le fond d’écran ou la coque de protection.', 'text', null::text[], 3::int, true, 130::int),
    ('electronics', 'elec-damage', 'L’appareil porte-t-il une éraflure, un impact ou une réparation visible ?', 'text', null::text[], 2::int, false, 140::int),
    ('electronics', 'elec-operator', 'Quel opérateur utilisez-vous sur cet appareil ?', 'choice', array['Airtel', 'Moov', 'Tigo', 'Autre', 'Aucun']::text[], 2::int, false, 150::int),
    ('valuables', 'val-model', 'Quelle est la marque et le modèle exact ?', 'text', null::text[], 3::int, true, 160::int),
    ('valuables', 'val-serial', 'Quel est le numéro de série ou l’IMEI ?', 'text', null::text[], 4::int, true, 170::int),
    ('valuables', 'val-engraving', 'Y a-t-il une gravure, une inscription ou un prénom ?', 'text', null::text[], 3::int, false, 180::int),
    ('valuables', 'val-case', 'Dans quel étui, écrin ou housse l’objet était-il rangé ?', 'text', null::text[], 2::int, false, 190::int),
    ('valuables', 'val-price', 'Quel était le prix d’achat approximatif ?', 'number', null::text[], 1::int, false, 200::int),
    ('special', 'spec-vehicle', 'Quelle est la marque, le modèle et l’année du véhicule ?', 'text', null::text[], 3::int, false, 210::int),
    ('special', 'spec-plate', 'Quels sont les derniers caractères de l’immatriculation ?', 'text', null::text[], 4::int, false, 220::int),
    ('special', 'spec-chassis', 'Quel est le numéro de châssis ou de série ?', 'text', null::text[], 4::int, false, 230::int),
    ('special', 'spec-lot-contents', 'Décrivez précisément le contenu du lot.', 'text', null::text[], 3::int, true, 240::int),
    ('special', 'spec-lot-count', 'Combien de pièces ou de colis composent le lot ?', 'number', null::text[], 2::int, true, 250::int),
    ('other', 'other-description', 'Décrivez précisément l’objet et sa matière.', 'text', null::text[], 4::int, true, 260::int),
    ('other', 'other-mark', 'Porte-t-il une inscription, un nom ou une marque ?', 'text', null::text[], 3::int, false, 270::int),
    ('other', 'other-color', 'Quelle est sa couleur ?', 'text', null::text[], 2::int, true, 280::int),
    ('other', 'other-container', 'Dans quoi ou avec quoi était-il rangé ?', 'text', null::text[], 2::int, false, 290::int)
) as v(category_code, code, prompt_fr, answer_kind, choices, weight, is_required, sort_order)
join item_categories c on c.code = v.category_code
on conflict (category_id, code) do update set
  prompt_fr   = excluded.prompt_fr,
  answer_kind = excluded.answer_kind,
  choices     = excluded.choices,
  weight      = excluded.weight,
  is_required = excluded.is_required,
  sort_order  = excluded.sort_order;

-- -----------------------------------------------------------------------------
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

  if n_neighborhoods < 22 then
    raise exception 'Seed incomplet : % quartiers attendus, % présents.', 22, n_neighborhoods;
  end if;

  if n_categories < 34 then
    raise exception 'Seed incomplet : % catégories attendues, % présentes.', 34, n_categories;
  end if;

  if n_item_types < 73 then
    raise exception 'Seed incomplet : % types d''objets attendus, % présents.', 73, n_item_types;
  end if;
end
$$;

commit;
