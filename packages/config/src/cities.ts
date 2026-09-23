/**
 * Villes.
 *
 * ⚠️ Les coordonnées sont **approximatives** (centre administratif de la ville). Elles
 * servent au tri par proximité et à l'affichage cartographique, pas au calcul d'itinéraire.
 * Elles doivent être affinées avant toute fonctionnalité de géolocalisation fine.
 *
 * `slug` est la clé stable utilisée par le référentiel et par les URL publiques
 * (`/objets-trouves/ndjamena`), jamais le nom : « N'Djamena » s'écrit aussi
 * « Ndjamena » ou « N’Djamena », et l'apostrophe typographique casserait les URL.
 */

export interface CityConfig {
  readonly slug: string;
  readonly countryCode: string;
  readonly name: string;
  readonly nameAr?: string;
  readonly lat: number;
  readonly lng: number;
  readonly isActive: boolean;
}

export const CITIES: readonly CityConfig[] = [
  {
    slug: 'ndjamena',
    countryCode: 'TD',
    name: "N'Djamena",
    nameAr: 'انجمينا',
    lat: 12.1348,
    lng: 15.0557,
    isActive: true,
  },
  {
    slug: 'moundou',
    countryCode: 'TD',
    name: 'Moundou',
    lat: 8.5667,
    lng: 16.0833,
    isActive: true,
  },
  {
    slug: 'abeche',
    countryCode: 'TD',
    name: 'Abéché',
    lat: 13.8292,
    lng: 20.8324,
    isActive: true,
  },
  {
    slug: 'sarh',
    countryCode: 'TD',
    name: 'Sarh',
    lat: 9.1429,
    lng: 18.3923,
    isActive: true,
  },
  {
    slug: 'bongor',
    countryCode: 'TD',
    name: 'Bongor',
    lat: 10.2806,
    lng: 15.3722,
    isActive: false,
  },
  {
    slug: 'mongo',
    countryCode: 'TD',
    name: 'Mongo',
    lat: 12.1844,
    lng: 18.6931,
    isActive: false,
  },
] as const;

/** Ville de lancement. */
export const DEFAULT_CITY_SLUG = 'ndjamena';

export const ACTIVE_CITIES: readonly CityConfig[] = CITIES.filter((city) => city.isActive);

export function findCity(slug: string): CityConfig | undefined {
  return CITIES.find((city) => city.slug === slug);
}

export function citiesOf(countryCode: string): readonly CityConfig[] {
  return CITIES.filter((city) => city.countryCode === countryCode);
}
