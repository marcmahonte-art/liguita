/**
 * Quartiers de N'Djamena.
 *
 * ⚠️ **À VALIDER PAR UN RÉFÉRENT LOCAL AVANT LA MISE EN PRODUCTION.**
 *
 * Cette liste de 22 quartiers a été établie à partir de la toponymie publique de la ville
 * et couvre les dix arrondissements. Elle n'a pas été confrontée à un habitant : les
 * limites entre quartiers sont mouvantes, certains noms sont employés de façon
 * interchangeable, et de nouveaux quartiers apparaissent régulièrement en périphérie.
 *
 * Le référentiel est conçu pour être étendu sans migration de schéma : ajouter une entrée
 * ici et dans la migration de seed suffit. Un quartier manquant n'empêche jamais une
 * déclaration — le champ reste facultatif, et `similarityPlace` retombe alors sur la ville.
 *
 * Le nombre de quartiers est vérifié par un test (`src/__tests__/referential.test.ts`) :
 * il fait partie de la Definition of Done du Sprint 0.
 */

export interface NeighborhoodConfig {
  readonly slug: string;
  readonly citySlug: string;
  readonly name: string;
  /** Arrondissement de rattachement, pour le regroupement dans l'interface. */
  readonly arrondissement: number;
}

export const NEIGHBORHOODS: readonly NeighborhoodConfig[] = [
  { slug: 'moursal', citySlug: 'ndjamena', name: 'Moursal', arrondissement: 1 },
  { slug: 'farcha', citySlug: 'ndjamena', name: 'Farcha', arrondissement: 1 },
  { slug: 'gardole', citySlug: 'ndjamena', name: 'Gardolé', arrondissement: 1 },
  { slug: 'chagoua', citySlug: 'ndjamena', name: 'Chagoua', arrondissement: 2 },
  { slug: 'klemat', citySlug: 'ndjamena', name: 'Klemat', arrondissement: 2 },
  { slug: 'mardjandaffack', citySlug: 'ndjamena', name: 'Mardjandaffack', arrondissement: 3 },
  { slug: 'paris-congo', citySlug: 'ndjamena', name: 'Paris Congo', arrondissement: 4 },
  { slug: 'ambatta', citySlug: 'ndjamena', name: 'Ambatta', arrondissement: 4 },
  { slug: 'sabangali', citySlug: 'ndjamena', name: 'Sabangali', arrondissement: 5 },
  { slug: 'ridina', citySlug: 'ndjamena', name: 'Ridina', arrondissement: 5 },
  { slug: 'dembe', citySlug: 'ndjamena', name: 'Dembé', arrondissement: 6 },
  { slug: 'gassi', citySlug: 'ndjamena', name: 'Gassi', arrondissement: 7 },
  { slug: 'atrone', citySlug: 'ndjamena', name: 'Atrone', arrondissement: 7 },
  { slug: 'amriguebe', citySlug: 'ndjamena', name: 'Amriguébé', arrondissement: 8 },
  { slug: 'djambalbarh', citySlug: 'ndjamena', name: 'Djambalbarh', arrondissement: 8 },
  { slug: 'diguel', citySlug: 'ndjamena', name: 'Diguel', arrondissement: 9 },
  { slug: 'ndjari', citySlug: 'ndjamena', name: 'Ndjari', arrondissement: 9 },
  { slug: 'bololo', citySlug: 'ndjamena', name: 'Bololo', arrondissement: 9 },
  { slug: 'toukra', citySlug: 'ndjamena', name: 'Toukra', arrondissement: 9 },
  { slug: 'walia', citySlug: 'ndjamena', name: 'Walia', arrondissement: 9 },
  { slug: 'habena', citySlug: 'ndjamena', name: 'Habena', arrondissement: 10 },
  { slug: 'gozator', citySlug: 'ndjamena', name: 'Gozator', arrondissement: 10 },
] as const;

export function neighborhoodsOf(citySlug: string): readonly NeighborhoodConfig[] {
  return NEIGHBORHOODS.filter((neighborhood) => neighborhood.citySlug === citySlug);
}

export function findNeighborhood(slug: string): NeighborhoodConfig | undefined {
  return NEIGHBORHOODS.find((neighborhood) => neighborhood.slug === slug);
}

/** Quartiers groupés par arrondissement, pour l'affichage en accordéon. */
export function neighborhoodsByArrondissement(
  citySlug: string,
): ReadonlyMap<number, readonly NeighborhoodConfig[]> {
  const grouped = new Map<number, NeighborhoodConfig[]>();

  for (const neighborhood of neighborhoodsOf(citySlug)) {
    const bucket = grouped.get(neighborhood.arrondissement);
    if (bucket) {
      bucket.push(neighborhood);
    } else {
      grouped.set(neighborhood.arrondissement, [neighborhood]);
    }
  }

  return grouped;
}
