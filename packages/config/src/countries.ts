/**
 * Pays desservis.
 *
 * Le Tchad est le seul pays actif au lancement. Les pays voisins sont présents dans le
 * référentiel — mais inactifs — pour deux raisons : un objet perdu à N'Djamena peut
 * réapparaître à Kousséri (Cameroun) ou à N'Guigmi (Niger), et une extension
 * régionale ne doit pas exiger de migration de schéma.
 */

export interface CountryConfig {
  /** Code ISO 3166-1 alpha-2. */
  readonly code: string;
  readonly name: string;
  readonly nameAr?: string;
  readonly currency: string;
  /** Indicatif téléphonique international, avec le « + ». */
  readonly phonePrefix: string;
  readonly languages: readonly string[];
  readonly isActive: boolean;
}

export const COUNTRIES: readonly CountryConfig[] = [
  {
    code: 'TD',
    name: 'Tchad',
    nameAr: 'تشاد',
    currency: 'XAF',
    phonePrefix: '+235',
    languages: ['fr', 'ar'],
    isActive: true,
  },
  {
    code: 'CM',
    name: 'Cameroun',
    currency: 'XAF',
    phonePrefix: '+237',
    languages: ['fr', 'en'],
    isActive: false,
  },
  {
    code: 'NE',
    name: 'Niger',
    currency: 'XOF',
    phonePrefix: '+227',
    languages: ['fr'],
    isActive: false,
  },
  {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    phonePrefix: '+234',
    languages: ['en'],
    isActive: false,
  },
  {
    code: 'SD',
    name: 'Soudan',
    currency: 'SDG',
    phonePrefix: '+249',
    languages: ['ar', 'en'],
    isActive: false,
  },
  {
    code: 'LY',
    name: 'Libye',
    currency: 'LYD',
    phonePrefix: '+218',
    languages: ['ar'],
    isActive: false,
  },
  {
    code: 'CF',
    name: 'République centrafricaine',
    currency: 'XAF',
    phonePrefix: '+236',
    languages: ['fr', 'sg'],
    isActive: false,
  },
] as const;

/** Pays actif au lancement. */
export const DEFAULT_COUNTRY_CODE = 'TD';

export const ACTIVE_COUNTRIES: readonly CountryConfig[] = COUNTRIES.filter(
  (country) => country.isActive,
);

export function findCountry(code: string): CountryConfig | undefined {
  return COUNTRIES.find((country) => country.code === code);
}
