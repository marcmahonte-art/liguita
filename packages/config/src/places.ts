/**
 * Lieux nommés et réutilisables.
 *
 * Un « lieu » est un endroit identifiable et stable : un aéroport, une gare, un marché,
 * un hôtel. C'est le signal de localisation le plus fort du moteur de correspondance
 * (similarité 1,00 quand deux déclarations désignent le même lieu, contre 0,70 pour un
 * simple quartier commun).
 *
 * ⚠️ Deux points à traiter avant la mise en production :
 *  · `isVerified` est à `false` partout. Le passage à `true` est une **décision métier** :
 *    un lieu vérifié est un lieu dont le gestionnaire a accepté de tenir un registre des
 *    objets trouvés. Le plan v3 (§16.6) prévoit trois établissements pilotes à signer.
 *  · Les coordonnées sont approximatives et doivent être relevées sur place.
 */

export interface PlaceConfig {
  readonly slug: string;
  readonly citySlug: string;
  readonly neighborhoodSlug: string;
  readonly placeType: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  /** Vrai quand le gestionnaire du lieu tient un registre d'objets trouvés. */
  readonly isVerified: boolean;
}

export const PLACES: readonly PlaceConfig[] = [
  // ---------- Transport ----------
  {
    slug: 'aeroport-hassan-djamous',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'farcha',
    placeType: 'airport',
    name: 'Aéroport International Hassan Djamous',
    lat: 12.1337,
    lng: 15.034,
    isVerified: false,
  },
  {
    slug: 'gare-routiere-centrale',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'moursal',
    placeType: 'bus_station',
    name: 'Gare routière centrale',
    lat: 12.1064,
    lng: 15.0455,
    isVerified: false,
  },
  {
    slug: 'gare-de-moursal',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'moursal',
    placeType: 'bus_station',
    name: 'Gare de Moursal',
    lat: 12.1017,
    lng: 15.0392,
    isVerified: false,
  },

  // ---------- Marchés ----------
  {
    slug: 'marche-central',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'chagoua',
    placeType: 'market',
    name: 'Grand marché central',
    lat: 12.1106,
    lng: 15.0491,
    isVerified: false,
  },
  {
    slug: 'marche-de-dembe',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'dembe',
    placeType: 'market',
    name: 'Marché de Dembé',
    lat: 12.1298,
    lng: 15.0872,
    isVerified: false,
  },
  {
    slug: 'marche-de-moursal',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'moursal',
    placeType: 'market',
    name: 'Marché de Moursal',
    lat: 12.1031,
    lng: 15.0424,
    isVerified: false,
  },
  {
    slug: 'marche-de-chagoua',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'chagoua',
    placeType: 'market',
    name: 'Marché de Chagoua',
    lat: 12.1038,
    lng: 15.0672,
    isVerified: false,
  },

  // ---------- Santé ----------
  {
    slug: 'hopital-general-de-reference',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'paris-congo',
    placeType: 'hospital',
    name: 'Hôpital général de référence nationale',
    lat: 12.1133,
    lng: 15.0616,
    isVerified: false,
  },
  {
    slug: 'hopital-mere-et-enfant',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'chagoua',
    placeType: 'hospital',
    name: "Hôpital de la Mère et de l'Enfant",
    lat: 12.1015,
    lng: 15.0652,
    isVerified: false,
  },
  {
    slug: 'chu-la-renaissance',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'ridina',
    placeType: 'hospital',
    name: 'CHU la Renaissance',
    lat: 12.1186,
    lng: 15.0813,
    isVerified: false,
  },

  // ---------- Enseignement ----------
  {
    slug: 'universite-de-ndjamena',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'ndjari',
    placeType: 'school',
    name: 'Université de N’Djamena',
    lat: 12.1158,
    lng: 15.1085,
    isVerified: false,
  },
  {
    slug: 'lycee-felix-eboue',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'ambatta',
    placeType: 'school',
    name: 'Lycée Félix Éboué',
    lat: 12.1145,
    lng: 15.0518,
    isVerified: false,
  },

  // ---------- Administrations et banques ----------
  {
    slug: 'palais-du-15',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'sabangali',
    placeType: 'administration',
    name: 'Palais du 15',
    lat: 12.1097,
    lng: 15.0436,
    isVerified: false,
  },
  {
    slug: 'poste-centrale',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'sabangali',
    placeType: 'administration',
    name: 'Poste centrale',
    lat: 12.1119,
    lng: 15.0464,
    isVerified: false,
  },
  {
    slug: 'beac-ndjamena',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'sabangali',
    placeType: 'bank',
    name: "Banque des États de l'Afrique Centrale",
    lat: 12.1093,
    lng: 15.0507,
    isVerified: false,
  },

  // ---------- Lieux de culte ----------
  {
    slug: 'grande-mosquee-de-ndjamena',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'klemat',
    placeType: 'mosque',
    name: 'Grande mosquée de N’Djamena',
    lat: 12.1086,
    lng: 15.0444,
    isVerified: false,
  },
  {
    slug: 'cathedrale-notre-dame',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'klemat',
    placeType: 'church',
    name: 'Cathédrale Notre-Dame de N’Djamena',
    lat: 12.1075,
    lng: 15.0432,
    isVerified: false,
  },

  // ---------- Sport ----------
  {
    slug: 'stade-idriss-mahamat-ouya',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'chagoua',
    placeType: 'stadium',
    name: 'Stade Idriss Mahamat Ouya',
    lat: 12.1032,
    lng: 15.0579,
    isVerified: false,
  },

  // ---------- Commerce et hôtellerie ----------
  {
    slug: 'supermarche-score',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'paris-congo',
    placeType: 'shop',
    name: 'Supermarché Score',
    lat: 12.1161,
    lng: 15.0512,
    isVerified: false,
  },
  {
    slug: 'hotel-kempinski-ndjamena',
    citySlug: 'ndjamena',
    neighborhoodSlug: 'farcha',
    placeType: 'hotel',
    name: 'Hôtel N’Djamena (ex-Kempinski)',
    lat: 12.1247,
    lng: 15.0457,
    isVerified: false,
  },
] as const;

export function placesOf(citySlug: string): readonly PlaceConfig[] {
  return PLACES.filter((place) => place.citySlug === citySlug);
}

export function placesOfType(placeType: string): readonly PlaceConfig[] {
  return PLACES.filter((place) => place.placeType === placeType);
}

export function findPlace(slug: string): PlaceConfig | undefined {
  return PLACES.find((place) => place.slug === slug);
}
