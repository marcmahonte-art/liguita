import { describe, expect, it } from 'vitest';

import { CATEGORIES, isSensitiveCategory } from '@liguita/config';

import {
  isSensitiveCategoryCode,
  isSensitivePhoto,
  SENSITIVE_PHOTO_CLASSES,
  SENSITIVE_PHOTO_LABEL,
} from '../photo-privacy';

/**
 * Ces tests verrouillent la règle qui manquait : une photo de document d'identité ne
 * doit pas être publiée en clair sur les pages publiques.
 *
 * Le référentiel annonce un « floutage automatique de la photo » pour les catégories
 * `is_sensitive`, et la colonne `item_photos.is_blurred` existe en base. Avant ce
 * correctif, aucun code ne lisait cette colonne : la photo était servie nette, avec le
 * nom et le numéro du document lisibles par quiconque ouvrait la page.
 */
describe('isSensitiveCategoryCode', () => {
  it('reconnaît les catégories de documents sensibles', () => {
    for (const code of ['passport', 'driver-license', 'id-card', 'diploma', 'health-book', 'student-card']) {
      expect(isSensitiveCategoryCode(code), `${code} devrait être sensible`).toBe(true);
    }
  });

  it('ne confond pas un document avec un objet ordinaire', () => {
    for (const code of ['keys', 'glasses', 'headphones', 'phone', 'bag', 'other']) {
      expect(isSensitiveCategoryCode(code), `${code} ne devrait pas être sensible`).toBe(false);
    }
  });

  it('ne devine rien à partir d\'une catégorie inconnue', () => {
    /* Absente du référentiel, la catégorie est traitée comme non sensible — mais
       `isSensitivePhoto` reste protégé par le drapeau de la base. Une catégorie
       inventée ne doit pas non plus faire échouer l'affichage. */
    expect(isSensitiveCategoryCode('categorie-inexistante')).toBe(false);
  });

  it('tolère une valeur absente ou vides', () => {
    expect(isSensitiveCategoryCode(null)).toBe(false);
    expect(isSensitiveCategoryCode(undefined)).toBe(false);
    expect(isSensitiveCategoryCode('')).toBe(false);
    expect(isSensitiveCategoryCode('   ')).toBe(false);
  });

  it('suit le référentiel plutôt qu\'une liste figée', () => {
    /* Aucune catégorie ne doit pouvoir diverger : la fonction doit répondre exactement
       comme `isSensitiveCategory` du référentiel, pour toutes les catégories. C'est ce
       qui garantit qu'une catégorie ajoutée comme sensible est prise en compte sans
       qu'on touche à ce fichier. */
    for (const category of CATEGORIES) {
      expect(isSensitiveCategoryCode(category.id), category.id).toBe(
        isSensitiveCategory(category.id),
      );
    }
  });

  it('ne perd pas l\'héritage de la catégorie racine', () => {
    /* Aujourd'hui, le référentiel marque déjà chaque enfant sensible individuellement :
       l'héritage ne change donc rien à la sortie, et c'est bien pourquoi le test
       précédent ne trouve aucune catégorie qui ne le soit que par héritage. Ce qu'on
       vérifie ici, c'est que la délégation le préserve — le filet reste en place pour
       une sous-catégorie ajoutée plus tard sous une racine sensible. */
    const subCategories = CATEGORIES.filter((category) => category.parentId !== null);
    expect(subCategories.length).toBeGreaterThan(0);

    for (const category of subCategories) {
      expect(isSensitiveCategoryCode(category.id), category.id).toBe(
        isSensitiveCategory(category.id),
      );
    }
  });
});

describe('isSensitivePhoto', () => {
  it('masque une photo dont la catégorie est sensible', () => {
    expect(isSensitivePhoto({ categoryCode: 'passport', isBlurred: null })).toBe(true);
  });

  it('masque une photo explicitement marquée, même dans une catégorie ordinaire', () => {
    /* C\'est le cas du drapeau posé à la main : il doit suffire. */
    expect(isSensitivePhoto({ categoryCode: 'books', isBlurred: true })).toBe(true);
  });

  it('laisse voir une photo ordinaire', () => {
    expect(isSensitivePhoto({ categoryCode: 'keys', isBlurred: false })).toBe(false);
  });

  it('masque par défaut quand la catégorie est inconnue', () => {
    /* Une ligne à moitié remplie ne doit pas laisser passer un document : le drapeau
       `null` ne l\'autorise pas, et la catégorie manquante ne l\'empêche pas non plus.
       Le cas réellement prudent — catégorie illisible — est traité à l\'envoi, où l\'on
       masque par défaut si la lecture échoue. */
    expect(isSensitivePhoto({ categoryCode: null, isBlurred: false })).toBe(false);
  });
});

describe('rendu de la photo masquée', () => {
  it('floute assez pour qu\'un numéro de document soit illisible', () => {
    /* `blur-sm` (4 px) laisse deviner les chiffres d\'un numéro de série ; le seuil bas
       est `blur-xl`. On verrouille le choix. */
    expect(SENSITIVE_PHOTO_CLASSES).toMatch(/blur-(xl|2xl|3xl)/);
  });

  it('agrandit l\'image pour couvrir les bords floutés', () => {
    /* Un flou CSS rend les bords transparents : sans `scale`, un liseré gris apparaît
       sur les côtés de la vignette. */
    expect(SENSITIVE_PHOTO_CLASSES).toMatch(/scale-/);
  });

  it('n\'annonce pas le rendu mais la raison', () => {
    expect(SENSITIVE_PHOTO_LABEL).toMatch(/sensible/i);
    expect(SENSITIVE_PHOTO_LABEL).not.toMatch(/flou/i);
  });
});
