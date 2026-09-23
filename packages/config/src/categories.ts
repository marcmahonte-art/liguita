/**
 * Catégories d'objets.
 *
 * Le référentiel est **hiérarchique sur deux niveaux** : six catégories racines (une par
 * grande famille d'usage) et des sous-catégories qui portent la classe tarifaire par défaut.
 *
 * L'utilisateur choisit d'abord une catégorie racine (« Électronique »), puis une
 * sous-catégorie (« Téléphone entrée ou milieu de gamme »). C'est la sous-catégorie qui
 * détermine la classe : une seule question posée à l'utilisateur, aucune notion de prix
 * à comprendre.
 *
 * ⚠️ `id` est un **slug stable**, pas un UUID. Il est utilisé tel quel par
 * `packages/core` (l'interface `CategoryRef` du moteur de tarification) et par le seed SQL
 * comme valeur de `item_categories.code`. Changer un `id` casse les devis déjà émis :
 * on ajoute une catégorie, on n'en renomme jamais une.
 *
 * ⚠️ `maxValueXaf` est le plafond **usuel** de la sous-catégorie. Au-delà, l'objet monte
 * d'une classe (`packages/core/src/pricing/classify.ts`). `null` = pas de plafond connu.
 *
 * Référence tarifaire : docs/Liguita_Plan_Implementation_v3.md §18.1
 */

import type { PricingClass } from '@liguita/core/pricing';

export interface CategoryConfig {
  readonly id: string;
  /** `null` pour une catégorie racine. */
  readonly parentId: string | null;
  readonly labelFr: string;
  readonly labelAr?: string;
  /** Nom de l'icône du design system. */
  readonly icon: string;
  readonly defaultClass: PricingClass;
  readonly minValueXaf: number | null;
  readonly maxValueXaf: number | null;
  /**
   * Vrai pour les documents d'identité : la photo doit être floutée automatiquement
   * et le numéro du document n'est jamais affiché en clair.
   */
  readonly isSensitive: boolean;
  /**
   * Faux quand demander une valeur n'a pas de sens (une carte d'identité n'a pas de
   * valeur marchande). Le formulaire masque alors le champ « valeur estimée ».
   */
  readonly asksDeclaredValue: boolean;
  readonly sortOrder: number;
}

export const CATEGORIES: readonly CategoryConfig[] = [
  /* ---------------------------------------------------------------------- */
  /* Catégories racines — les six familles du lancement                      */
  /* ---------------------------------------------------------------------- */
  {
    id: 'documents',
    parentId: null,
    labelFr: 'Documents & cartes',
    labelAr: 'وثائق',
    icon: 'id-card',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 10,
  },
  {
    id: 'personal',
    parentId: null,
    labelFr: 'Effets personnels',
    icon: 'bag',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 20,
  },
  {
    id: 'electronics',
    parentId: null,
    labelFr: 'Électronique',
    icon: 'phone',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 30,
  },
  {
    id: 'valuables',
    parentId: null,
    labelFr: 'Objets de valeur',
    icon: 'gem',
    defaultClass: 'C4',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 40,
  },
  {
    id: 'special',
    parentId: null,
    labelFr: 'Cas spéciaux',
    icon: 'truck',
    defaultClass: 'C5',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 50,
  },
  {
    id: 'other',
    parentId: null,
    labelFr: 'Divers',
    icon: 'box',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 60,
  },

  /* ---------------------------------------------------------------------- */
  /* Documents & cartes — classe C1, 300 FCFA                                */
  /* ---------------------------------------------------------------------- */
  {
    id: 'id-card',
    parentId: 'documents',
    labelFr: "Carte nationale d'identité",
    icon: 'id-card',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 10,
  },
  {
    id: 'passport',
    parentId: 'documents',
    labelFr: 'Passeport',
    icon: 'id-card',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 20,
  },
  {
    id: 'driver-license',
    parentId: 'documents',
    labelFr: 'Permis de conduire',
    icon: 'id-card',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 30,
  },
  {
    id: 'diploma',
    parentId: 'documents',
    labelFr: 'Diplôme ou relevé de notes',
    icon: 'scroll',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 40,
  },
  {
    id: 'student-card',
    parentId: 'documents',
    labelFr: "Carte d'étudiant",
    icon: 'id-card',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 50,
  },
  {
    id: 'health-book',
    parentId: 'documents',
    labelFr: 'Carnet de santé',
    icon: 'heart-pulse',
    defaultClass: 'C1',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: true,
    asksDeclaredValue: false,
    sortOrder: 60,
  },

  /* ---------------------------------------------------------------------- */
  /* Effets personnels — classe C2, 700 FCFA                                 */
  /* ---------------------------------------------------------------------- */
  {
    id: 'wallet',
    parentId: 'personal',
    labelFr: 'Portefeuille',
    icon: 'wallet',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 150_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 10,
  },
  {
    id: 'bag',
    parentId: 'personal',
    labelFr: 'Sac ou sacoche',
    icon: 'bag',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 200_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 20,
  },
  {
    id: 'keys',
    parentId: 'personal',
    labelFr: 'Clés',
    icon: 'key',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 20_000,
    isSensitive: false,
    asksDeclaredValue: false,
    sortOrder: 30,
  },
  {
    id: 'glasses',
    parentId: 'personal',
    labelFr: 'Lunettes',
    icon: 'glasses',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 100_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 40,
  },
  {
    id: 'clothes',
    parentId: 'personal',
    labelFr: 'Vêtements',
    icon: 'shirt',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 100_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 50,
  },
  {
    id: 'books',
    parentId: 'personal',
    labelFr: 'Livres et fournitures',
    icon: 'book',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 50_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 60,
  },
  {
    id: 'fashion-jewelry',
    parentId: 'personal',
    labelFr: 'Bijoux fantaisie',
    icon: 'gem',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: 50_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 70,
  },

  /* ---------------------------------------------------------------------- */
  /* Électronique — classe C3, 1 200 FCFA                                    */
  /* ---------------------------------------------------------------------- */
  {
    id: 'phone',
    parentId: 'electronics',
    labelFr: 'Téléphone entrée ou milieu de gamme',
    icon: 'phone',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 200_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 10,
  },
  {
    id: 'tablet',
    parentId: 'electronics',
    labelFr: 'Tablette',
    icon: 'tablet',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 300_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 20,
  },
  {
    id: 'laptop',
    parentId: 'electronics',
    labelFr: 'Ordinateur portable',
    icon: 'laptop',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 600_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 30,
  },
  {
    id: 'headphones',
    parentId: 'electronics',
    labelFr: 'Écouteurs ou casque',
    icon: 'headphones',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 100_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 40,
  },
  {
    id: 'smartwatch',
    parentId: 'electronics',
    labelFr: 'Montre connectée',
    icon: 'watch',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 250_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 50,
  },
  {
    id: 'camera',
    parentId: 'electronics',
    labelFr: 'Appareil photo',
    icon: 'camera',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 400_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 60,
  },
  {
    id: 'bicycle',
    parentId: 'electronics',
    labelFr: 'Vélo',
    icon: 'bike',
    defaultClass: 'C3',
    minValueXaf: null,
    maxValueXaf: 250_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 70,
  },

  /* ---------------------------------------------------------------------- */
  /* Objets de valeur — classe C4, 3 000 FCFA                                */
  /* ---------------------------------------------------------------------- */
  {
    id: 'smartphone-premium',
    parentId: 'valuables',
    labelFr: 'Smartphone haut de gamme',
    icon: 'phone',
    defaultClass: 'C4',
    minValueXaf: 200_000,
    maxValueXaf: 900_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 10,
  },
  {
    id: 'precious-jewelry',
    parentId: 'valuables',
    labelFr: 'Bijoux précieux',
    icon: 'gem',
    defaultClass: 'C4',
    minValueXaf: 200_000,
    maxValueXaf: 1_000_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 20,
  },
  {
    id: 'designer-bag',
    parentId: 'valuables',
    labelFr: 'Sac de marque',
    icon: 'bag',
    defaultClass: 'C4',
    minValueXaf: 200_000,
    maxValueXaf: 800_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 30,
  },
  {
    id: 'pro-equipment',
    parentId: 'valuables',
    labelFr: 'Matériel professionnel',
    icon: 'tool',
    defaultClass: 'C4',
    minValueXaf: 200_000,
    maxValueXaf: 1_000_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 40,
  },
  {
    id: 'instrument',
    parentId: 'valuables',
    labelFr: 'Instrument de musique',
    icon: 'music',
    defaultClass: 'C4',
    minValueXaf: 200_000,
    maxValueXaf: 700_000,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 50,
  },

  /* ---------------------------------------------------------------------- */
  /* Cas spéciaux — classe C5, 1 % de la valeur déclarée                     */
  /* ---------------------------------------------------------------------- */
  {
    id: 'vehicle',
    parentId: 'special',
    labelFr: 'Véhicule ou engin',
    icon: 'truck',
    defaultClass: 'C5',
    minValueXaf: 1_000_000,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 10,
  },
  {
    id: 'business-lot',
    parentId: 'special',
    labelFr: "Lot d'entreprise ou de fret",
    icon: 'package',
    defaultClass: 'C5',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 20,
  },

  /* ---------------------------------------------------------------------- */
  /* Divers — classe C2 par défaut, conformément à la règle « cas ambigu »   */
  /* ---------------------------------------------------------------------- */
  {
    id: 'other-item',
    parentId: 'other',
    labelFr: 'Autre objet',
    icon: 'box',
    defaultClass: 'C2',
    minValueXaf: null,
    maxValueXaf: null,
    isSensitive: false,
    asksDeclaredValue: true,
    sortOrder: 10,
  },
] as const;

/** Les six catégories racines, dans l'ordre d'affichage. */
export const ROOT_CATEGORIES: readonly CategoryConfig[] = CATEGORIES.filter(
  (category) => category.parentId === null,
);

export function findCategory(id: string): CategoryConfig | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export function categoriesOf(parentId: string): readonly CategoryConfig[] {
  return CATEGORIES.filter((category) => category.parentId === parentId);
}

/** Sous-catégories seules : celles que l'utilisateur choisit réellement. */
export const LEAF_CATEGORIES: readonly CategoryConfig[] = CATEGORIES.filter(
  (category) => category.parentId !== null,
);

/**
 * Vrai si la catégorie est un document d'identité.
 * Utilisé pour déclencher le floutage automatique de la photo et masquer le numéro.
 */
export function isSensitiveCategory(id: string): boolean {
  const category = findCategory(id);
  if (!category) return false;
  if (category.isSensitive) return true;
  // Une sous-catégorie hérite du caractère sensible de sa catégorie racine.
  return category.parentId ? (findCategory(category.parentId)?.isSensitive ?? false) : false;
}
