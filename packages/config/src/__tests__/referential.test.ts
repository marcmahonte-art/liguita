/**
 * Intégrité du référentiel.
 *
 * Ces tests ne vérifient pas du code : ils vérifient des **données**. C'est précisément
 * ce qui les rend utiles — une référence orpheline (un lieu rattaché à un quartier
 * inexistant, un type d'objet rattaché à une catégorie supprimée) ne se voit pas à la
 * compilation et ne casse rien au démarrage. Elle produit simplement des écrans vides
 * en production, des semaines plus tard.
 *
 * Les deux contraintes les plus importantes :
 *  · **22 quartiers de N'Djamena** — chiffre inscrit dans la Definition of Done du Sprint 0.
 *  · **Chaque catégorie terminale possède au moins un type d'objet** — sans quoi le score
 *    de correspondance plafonne à 88 et le niveau « très probable » devient inatteignable.
 */

import { describe, expect, it } from 'vitest';

import { CATEGORIES, LEAF_CATEGORIES, ROOT_CATEGORIES, findCategory } from '../categories';
import { CITIES, findCity } from '../cities';
import { COUNTRIES, findCountry } from '../countries';
import { ITEM_TYPES, itemTypesOf } from '../item-types';
import { NEIGHBORHOODS } from '../neighborhoods';
import { PLACE_TYPES, findPlaceType } from '../place-types';
import { PLACES } from '../places';
import { VERIFICATION_QUESTIONS, questionsForCategory } from '../verification-questions';

const VALID_CLASSES = ['C1', 'C2', 'C3', 'C4', 'C5'];

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

describe('référentiel — pays et villes', () => {
  it('n’a aucun code pays en double', () => {
    expect(duplicates(COUNTRIES.map((country) => country.code))).toEqual([]);
  });

  it('n’a qu’un seul pays actif : le Tchad', () => {
    expect(COUNTRIES.filter((country) => country.isActive).map((country) => country.code)).toEqual([
      'TD',
    ]);
  });

  it('rattache chaque ville à un pays connu', () => {
    for (const city of CITIES) {
      expect(findCountry(city.countryCode), `ville ${city.slug}`).toBeDefined();
    }
  });

  it('n’a aucun slug de ville en double', () => {
    expect(duplicates(CITIES.map((city) => city.slug))).toEqual([]);
  });

  it('déclare des coordonnées plausibles pour le Tchad', () => {
    // Le Tchad s'étend approximativement de 7° à 24° N et de 13° à 24° E.
    // Une coordonnée hors de ces bornes signale une inversion latitude/longitude.
    for (const city of CITIES.filter((item) => item.countryCode === 'TD')) {
      expect(city.lat, `latitude de ${city.slug}`).toBeGreaterThan(6);
      expect(city.lat, `latitude de ${city.slug}`).toBeLessThan(24);
      expect(city.lng, `longitude de ${city.slug}`).toBeGreaterThan(13);
      expect(city.lng, `longitude de ${city.slug}`).toBeLessThan(25);
    }
  });
});

describe('référentiel — quartiers', () => {
  it('contient exactement les 22 quartiers de N’Djamena du Sprint 0', () => {
    expect(NEIGHBORHOODS).toHaveLength(22);
  });

  it('n’a aucun slug de quartier en double', () => {
    expect(duplicates(NEIGHBORHOODS.map((neighborhood) => neighborhood.slug))).toEqual([]);
  });

  it('rattache chaque quartier à une ville connue', () => {
    for (const neighborhood of NEIGHBORHOODS) {
      expect(findCity(neighborhood.citySlug), `quartier ${neighborhood.slug}`).toBeDefined();
    }
  });

  it('couvre les dix arrondissements de N’Djamena', () => {
    const arrondissements = new Set(
      NEIGHBORHOODS.filter((item) => item.citySlug === 'ndjamena').map(
        (item) => item.arrondissement,
      ),
    );
    expect([...arrondissements].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('référentiel — types de lieux et lieux', () => {
  it('n’a aucun code de type de lieu en double', () => {
    expect(duplicates(PLACE_TYPES.map((placeType) => placeType.code))).toEqual([]);
  });

  it('rattache chaque lieu à une ville, un quartier et un type connus', () => {
    for (const place of PLACES) {
      expect(findCity(place.citySlug), `ville du lieu ${place.slug}`).toBeDefined();
      expect(
        NEIGHBORHOODS.some(
          (neighborhood) =>
            neighborhood.slug === place.neighborhoodSlug &&
            neighborhood.citySlug === place.citySlug,
        ),
        `quartier du lieu ${place.slug}`,
      ).toBe(true);
      expect(findPlaceType(place.placeType), `type du lieu ${place.slug}`).toBeDefined();
    }
  });

  it('n’a aucun slug de lieu en double', () => {
    expect(duplicates(PLACES.map((place) => place.slug))).toEqual([]);
  });

  it('marque tous les lieux comme non vérifiés tant qu’aucun partenariat n’est signé', () => {
    // Garde-fou : passer `isVerified` à `true` est une décision métier. Ce test doit être
    // mis à jour sciemment, au moment où les établissements pilotes signent.
    expect(PLACES.every((place) => !place.isVerified)).toBe(true);
  });
});

describe('référentiel — catégories', () => {
  it('expose exactement six catégories racines', () => {
    expect(ROOT_CATEGORIES).toHaveLength(6);
  });

  it('couvre les cinq classes tarifaires avec les catégories racines', () => {
    const classes = new Set(ROOT_CATEGORIES.map((category) => category.defaultClass));
    expect([...classes].sort()).toEqual(VALID_CLASSES);
  });

  it('n’a aucun identifiant de catégorie en double', () => {
    expect(duplicates(CATEGORIES.map((category) => category.id))).toEqual([]);
  });

  it('rattache chaque sous-catégorie à une catégorie racine existante', () => {
    for (const category of LEAF_CATEGORIES) {
      const parent = category.parentId ? findCategory(category.parentId) : undefined;
      expect(parent, `parent de ${category.id}`).toBeDefined();
      expect(parent?.parentId, `parent racine de ${category.id}`).toBeNull();
    }
  });

  it('n’utilise que des classes tarifaires valides', () => {
    for (const category of CATEGORIES) {
      expect(VALID_CLASSES, `classe de ${category.id}`).toContain(category.defaultClass);
    }
  });

  it('n’exige une valeur déclarée que pour les catégories qui en ont une', () => {
    // Un document d'identité n'a pas de valeur marchande : demander un montant à son
    // sujet n'a pas de sens et introduirait un classement tarifaire arbitraire.
    for (const category of CATEGORIES.filter((item) => item.id === 'documents' || item.parentId === 'documents')) {
      expect(category.asksDeclaredValue, `catégorie ${category.id}`).toBe(false);
    }
  });

  it('déclare les documents d’identité comme sensibles', () => {
    for (const category of CATEGORIES.filter((item) => item.parentId === 'documents')) {
      expect(category.isSensitive, `catégorie ${category.id}`).toBe(true);
    }
  });
});

describe('référentiel — types d’objets', () => {
  it('n’a aucun identifiant de type en double', () => {
    expect(duplicates(ITEM_TYPES.map((itemType) => itemType.id))).toEqual([]);
  });

  it('rattache chaque type à une catégorie terminale existante', () => {
    for (const itemType of ITEM_TYPES) {
      const category = findCategory(itemType.categoryId);
      expect(category, `catégorie du type ${itemType.id}`).toBeDefined();
      expect(category?.parentId, `le type ${itemType.id} doit viser une sous-catégorie`).not.toBeNull();
    }
  });

  it('donne au moins un type à chaque catégorie terminale', () => {
    // Contrainte arithmétique : sans type d'objet, le signal « type » plafonne à 0,60,
    // le score maximal tombe à 88 sur 100 et le niveau « très probable » (seuil 90)
    // devient inatteignable. Une catégorie sans type rend donc ses objets impossibles
    // à notifier en priorité.
    const orphans = LEAF_CATEGORIES.filter((category) => itemTypesOf(category.id).length === 0).map(
      (category) => category.id,
    );
    expect(orphans).toEqual([]);
  });

  it('n’utilise que des classes tarifaires valides pour les surcharges de type', () => {
    for (const itemType of ITEM_TYPES.filter((item) => item.defaultClass !== null)) {
      expect(VALID_CLASSES, `classe du type ${itemType.id}`).toContain(itemType.defaultClass);
    }
  });
});

describe('référentiel — questions de vérification', () => {
  it('couvre les six catégories racines', () => {
    for (const category of ROOT_CATEGORIES) {
      expect(questionsForCategory(category.id).length, `questions de ${category.id}`).toBeGreaterThan(0);
    }
  });

  it('n’a aucun identifiant de question en double', () => {
    expect(duplicates(VERIFICATION_QUESTIONS.map((question) => question.id))).toEqual([]);
  });

  it('accompagne chaque question à choix fermé de ses propositions', () => {
    for (const question of VERIFICATION_QUESTIONS.filter((item) => item.answerKind === 'choice')) {
      expect(question.choices?.length ?? 0, `propositions de ${question.id}`).toBeGreaterThan(1);
    }
  });

  it('attribue un poids strictement positif à chaque question', () => {
    for (const question of VERIFICATION_QUESTIONS) {
      expect(question.weight, `poids de ${question.id}`).toBeGreaterThan(0);
    }
  });
});
