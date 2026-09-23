/**
 * Types de lieux.
 *
 * Le typage d'un lieu n'est pas cosmétique : il conditionne la question posée à l'utilisateur.
 * Un objet trouvé « à l'aéroport » n'est pas conservé de la même façon qu'un objet trouvé
 * « dans un taxi » — dans le premier cas il existe un bureau des objets trouvés, dans le
 * second il est entre les mains du chauffeur.
 */

export interface PlaceTypeConfig {
  readonly code: string;
  readonly labelFr: string;
  readonly labelAr?: string;
  /** Nom de l'icône du design system. */
  readonly icon: string;
  /** Ordre d'affichage : les lieux les plus fréquents d'abord. */
  readonly sortOrder: number;
}

export const PLACE_TYPES: readonly PlaceTypeConfig[] = [
  { code: 'market', labelFr: 'Marché', labelAr: 'سوق', icon: 'storefront', sortOrder: 10 },
  { code: 'taxi', labelFr: 'Taxi', icon: 'car', sortOrder: 20 },
  { code: 'bus_station', labelFr: 'Gare routière', icon: 'bus', sortOrder: 30 },
  { code: 'airport', labelFr: 'Aéroport', icon: 'plane', sortOrder: 40 },
  { code: 'school', labelFr: 'École ou université', icon: 'school', sortOrder: 50 },
  { code: 'hospital', labelFr: 'Hôpital ou centre de santé', icon: 'hospital', sortOrder: 60 },
  { code: 'administration', labelFr: 'Administration', icon: 'building', sortOrder: 70 },
  { code: 'bank', labelFr: 'Banque ou bureau de change', icon: 'bank', sortOrder: 80 },
  { code: 'mosque', labelFr: 'Mosquée', labelAr: 'مسجد', icon: 'mosque', sortOrder: 90 },
  { code: 'church', labelFr: 'Église', icon: 'church', sortOrder: 100 },
  { code: 'hotel', labelFr: 'Hôtel', icon: 'bed', sortOrder: 110 },
  { code: 'restaurant', labelFr: 'Restaurant ou salon de thé', icon: 'utensils', sortOrder: 120 },
  { code: 'shop', labelFr: 'Boutique ou supermarché', icon: 'cart', sortOrder: 130 },
  { code: 'stadium', labelFr: 'Stade ou terrain de sport', icon: 'ball', sortOrder: 140 },
  { code: 'street', labelFr: 'Rue ou carrefour', icon: 'road', sortOrder: 150 },
  { code: 'other', labelFr: 'Autre lieu', icon: 'pin', sortOrder: 999 },
] as const;

export function findPlaceType(code: string): PlaceTypeConfig | undefined {
  return PLACE_TYPES.find((placeType) => placeType.code === code);
}
