/**
 * Confidentialité des photos d'objets.
 *
 * ⚠️ **Pourquoi ce module existe.**
 *
 * Le référentiel marque certaines catégories `is_sensitive` — passeport, permis, carte
 * d'identité, diplôme, carnet de santé — avec la mention « floutage automatique de la
 * photo ». Cette colonne `is_blurred` existe bien en base, mais **aucun code ne la
 * lisait** : une photo de permis était donc publiée en clair sur les pages publiques,
 * servie par URL signée, avec le nom et le numéro du document lisibles.
 *
 * Ce module comble cet écart. Il est **pur** : aucune dépendance à React, à Supabase
 * ou au navigateur, donc testable directement.
 *
 * La règle est double, et c'est volontaire :
 *   * la **catégorie** décide, parce qu'elle est la vérité métier et qu'elle existe
 *     déjà pour toutes les lignes, passées ou futures ;
 *   * le **drapeau `is_blurred`** compte aussi, parce qu'il permet de masquer une
 *     photo précise indépendamment de sa catégorie — un student card rangé sous
 *     « Fournitures », par exemple.
 *
 * Une photo est donc traitée comme sensible dès que l'un des deux le dit. L'inverse —
 * se fier au seul drapeau — laisserait passer toutes les photos déjà en base.
 */

import { isSensitiveCategory } from '@liguita/config';

/**
 * La catégorie est-elle sensible ?
 *
 * ⚠️ Délégué à `@liguita/config`, qui **hérite** du caractère sensible de la catégorie
 * racine : une sous-catégorie de « Documents & cartes » est donc traitée comme
 * sensible sans avoir à être marquée à son tour.
 *
 * Cette fonction n'existe pas ici, contrairement à une première version qui
 * recalculait `findCategory(code)?.isSensitive` — elle ignorait cette héritage, et
 * laissait donc passer les sous-catégories de documents. Le référentiel est la seule
 * source de vérité, et il sait déjà répondre.
 */
export function isSensitiveCategoryCode(
  categoryCode: string | null | undefined,
): boolean {
  if (!categoryCode) return false;
  return isSensitiveCategory(categoryCode.trim());
}

export interface PhotoPrivacyInput {
  /** `category_code` de l'objet auquel appartient la photo. */
  categoryCode: string | null | undefined;
  /** Valeur de `item_photos.is_blurred`. */
  isBlurred?: boolean | null;
}

/** La photo doit-elle être masquée à l'affichage public ? */
export function isSensitivePhoto({ categoryCode, isBlurred }: PhotoPrivacyInput): boolean {
  return isBlurred === true || isSensitiveCategoryCode(categoryCode);
}

/**
 * Classes d'une photo masquée.
 *
 * ⚠️ Le `scale-110` n'est pas décoratif : un flou CSS ramène les bords vers la
 * transparence, ce qui fait apparaître un liseré gris sur les côtés de la vignette. On
 * agrandit l'image de 10 % pour que la zone floutée couvre toujours le cadre.
 *
 * `blur-2xl` (40 px) et non `blur-sm` : sur un document, un flou faible laisse les
 * chiffres d'un numéro de série devinables. La photo reste reconnaissable comme
 * document — c'est utile au rapprochement — sans rien révéler de lisible.
 */
export const SENSITIVE_PHOTO_CLASSES = 'scale-110 blur-2xl';

/** Classes d'une photo qui ne demande aucun traitement. */
export const VISIBLE_PHOTO_CLASSES = '';

/**
 * Libellé affiché sur une photo masquée.
 *
 * On ne dit pas « flouté » — c'est un terme de rendu, pas une information utile pour
 * quelqu'un qui reconnaît son permis. On dit ce que la photo est, et pourquoi elle ne
 * se voit pas.
 */
export const SENSITIVE_PHOTO_LABEL = 'Document sensible — photo masquée';
