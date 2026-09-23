import { describe, expect, it } from 'vitest';

import {
  levelFromScore,
  scoreMatch,
  shouldNotify,
  shouldPersist,
  similarityBrand,
  similarityColor,
  similarityDate,
  similarityDescription,
  similarityPlace,
  similarityType,
} from '../score';
import { jaccard, normalizeColor, tokens, trigramSimilarity, trigrams } from '../text';
import type { FoundSide, LostSide } from '../types';

/* -------------------------------------------------------------------------- */
/* Jeux de données réalistes — contexte N'Djamena                              */
/* -------------------------------------------------------------------------- */

const BASE: Omit<LostSide, 'lostAt'> = {
  itemTypeId: 'type-tecno-pop',
  categoryId: 'cat-phone',
  parentCategoryId: 'cat-electronics',
  placeId: 'place-marche-central',
  neighborhoodId: 'nb-moursal',
  cityId: 'city-ndjamena',
  countryCode: 'TD',
  colorCode: 'BLACK',
  brand: 'Tecno',
  description: null,
};

const at = (iso: string) => new Date(`${iso}T10:00:00.000Z`);

const lost = (overrides: Partial<LostSide> = {}): LostSide => ({
  ...BASE,
  lostAt: at('2026-09-19'),
  ...overrides,
});

const found = (overrides: Partial<FoundSide> = {}): FoundSide => ({
  ...BASE,
  foundAt: at('2026-09-19'),
  ...overrides,
});

/* -------------------------------------------------------------------------- */
/* Score global — scénarios de référence (plan v3 §6.7)                        */
/* -------------------------------------------------------------------------- */

describe('score de correspondance', () => {
  it('cas 6 — téléphone identique au même endroit le même jour : très probable', () => {
    const result = scoreMatch(lost(), found());
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe('VERY_LIKELY');
    expect(shouldNotify(result)).toBe(true);
  });

  it('cas 7 — carte d’identité trouvée au même endroit le même jour : très probable', () => {
    const card: Partial<LostSide> = {
      itemTypeId: 'type-cni',
      categoryId: 'cat-id-card',
      parentCategoryId: 'cat-documents',
      colorCode: 'WHITE',
      brand: null,
      description: null,
    };
    const result = scoreMatch(
      lost({ ...card, lostAt: at('2026-09-21') }),
      found({ ...card, foundAt: at('2026-09-21') }),
    );
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe('VERY_LIKELY');
  });

  it('cas 1 — descriptions proches : score quasi parfait', () => {
    const result = scoreMatch(
      lost({ description: 'coque bleue avec autocollant sur l’écran' }),
      found({ description: 'coque bleue avec un autocollant sur l ecran' }),
    );
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it('cas 2 — même catégorie, même quartier, 3 jours d’écart, couleur différente : faible', () => {
    const result = scoreMatch(
      lost({
        itemTypeId: 'type-other',
        placeId: null,
        neighborhoodId: null,
        colorCode: 'BLACK',
        lostAt: at('2026-09-19'),
      }),
      found({
        itemTypeId: null,
        placeId: null,
        neighborhoodId: null,
        colorCode: 'WHITE',
        foundAt: at('2026-09-22'),
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.score).toBeLessThan(70);
    expect(result.level).toBe('WEAK');
    expect(shouldNotify(result)).toBe(false);
  });

  it('cas 3 — catégories et villes différentes : sous le seuil de persistance', () => {
    const result = scoreMatch(
      lost({
        itemTypeId: 'type-phone',
        categoryId: 'cat-phone',
        parentCategoryId: 'cat-electronics',
        cityId: 'city-ndjamena',
        placeId: null,
        neighborhoodId: null,
        brand: null,
      }),
      found({
        itemTypeId: 'type-clothes',
        categoryId: 'cat-clothes',
        parentCategoryId: 'cat-personal',
        cityId: 'city-moundou',
        placeId: null,
        neighborhoodId: null,
        brand: null,
        colorCode: 'RED',
      }),
    );
    expect(result.score).toBeLessThan(55);
    expect(shouldPersist(result)).toBe(false);
  });

  it('cas 4 — objet trouvé 5 jours avant la perte : rejeté', () => {
    const result = scoreMatch(lost({ lostAt: at('2026-09-20') }), found({ foundAt: at('2026-09-15') }));
    expect(result.breakdown.date).toBe(0);
    expect(result.score).toBeLessThan(85);
  });

  it('cas 5 — champs optionnels vides des deux côtés : faible, aucune notification', () => {
    const sparse: Partial<LostSide> = {
      itemTypeId: null,
      parentCategoryId: null,
      placeId: null,
      neighborhoodId: null,
      colorCode: null,
      brand: null,
      description: null,
    };
    const result = scoreMatch(lost({ ...sparse }), found({ ...sparse }));
    expect(result.score).toBeLessThan(70);
    expect(result.level).toBe('WEAK');
    expect(shouldNotify(result)).toBe(false);
  });

  it('la règle des données manquantes est neutre, pas punitive', () => {
    const full = scoreMatch(lost(), found());
    const sparse = scoreMatch(
      lost({ colorCode: null, brand: null, description: null }),
      found({ colorCode: null, brand: null, description: null }),
    );
    // Une annonce incomplète perd des points, mais reste au-dessus de zéro sur ces signaux.
    expect(sparse.breakdown.color).toBe(0.5);
    expect(sparse.breakdown.brand).toBe(0.5);
    expect(sparse.breakdown.description).toBe(0.5);
    expect(sparse.score).toBeLessThan(full.score);
    expect(sparse.score).toBeGreaterThan(50);
  });

  it('le détail du score est complet et exploitable pour l’analyse', () => {
    const { breakdown } = scoreMatch(lost(), found());
    for (const value of Object.values(breakdown)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(Object.keys(breakdown).sort()).toEqual([
      'brand',
      'color',
      'date',
      'description',
      'place',
      'type',
    ]);
  });

  it('documente le plafond de score quand le type d’objet est absent', () => {
    // ⚠️ Contrainte d'implémentation importante : si `itemTypeId` est nul des deux côtés,
    // le signal type plafonne à 0,60 (même catégorie), soit 18 points sur 30.
    //
    // Tous les autres signaux au maximum, le score atteint :
    //   18 (type) + 25 (lieu) + 15 (date) + 10 (couleur) + 10 (marque) + 10 (description) = 88
    // soit strictement moins que 90 : une correspondance ne peut JAMAIS être qualifiée de
    // « très probable » sans un type d'objet identique.
    //
    // Conséquence produit : le champ « type d'objet » doit être effectivement obligatoire
    // dans le formulaire de déclaration, sinon le produit ne notifiera jamais ses
    // utilisateurs avec le niveau de confiance le plus élevé.
    const sameCategoryDifferentType = scoreMatch(
      lost({ itemTypeId: null, description: 'coque noire rayée sur l’écran' }),
      found({ itemTypeId: null, description: 'coque noire rayée sur l’écran' }),
    );
    expect(sameCategoryDifferentType.breakdown.type).toBe(0.6);
    expect(sameCategoryDifferentType.breakdown.description).toBe(1);
    expect(sameCategoryDifferentType.score).toBe(88);
    expect(sameCategoryDifferentType.score).toBeLessThan(90);
    expect(sameCategoryDifferentType.level).toBe('POSSIBLE');
  });

  it('abaisse encore le plafond quand les descriptions sont vides (règle neutre)', () => {
    // Deux descriptions absentes ne valent pas une description identique : le signal
    // retombe à 0,50, soit 5 points au lieu de 10. Le plafond réel d'une déclaration
    // sans type d'objet ni description est donc 83, pas 88.
    const minimal = scoreMatch(lost({ itemTypeId: null }), found({ itemTypeId: null }));
    expect(minimal.breakdown.description).toBe(0.5);
    expect(minimal.score).toBe(83);
    expect(minimal.level).toBe('POSSIBLE');
  });
});

/* -------------------------------------------------------------------------- */
/* Similarités prises isolément                                                */
/* -------------------------------------------------------------------------- */

describe('similarité — type', () => {
  it('vaut 1 pour un type identique', () => {
    expect(similarityType(lost(), found())).toBe(1);
  });

  it('vaut 0,6 pour une catégorie identique', () => {
    expect(similarityType(lost({ itemTypeId: 'a' }), found({ itemTypeId: 'b' }))).toBe(0.6);
  });

  it('vaut 0,3 pour des catégories sœurs', () => {
    expect(
      similarityType(
        lost({ itemTypeId: 'a', categoryId: 'cat-phone' }),
        found({ itemTypeId: 'b', categoryId: 'cat-laptop' }),
      ),
    ).toBe(0.3);
  });

  it('vaut 0 pour des catégories sans parent commun', () => {
    expect(
      similarityType(
        lost({ itemTypeId: 'a', categoryId: 'cat-phone', parentCategoryId: 'cat-electronics' }),
        found({ itemTypeId: 'b', categoryId: 'cat-clothes', parentCategoryId: 'cat-personal' }),
      ),
    ).toBe(0);
  });
});

describe('similarité — lieu', () => {
  it('vaut 1 pour un lieu identique', () => {
    expect(similarityPlace(lost(), found())).toBe(1);
  });

  it('vaut 0,7 pour un quartier identique sans lieu précis', () => {
    expect(similarityPlace(lost({ placeId: null }), found({ placeId: null }))).toBe(0.7);
  });

  it('vaut 0,4 pour une ville identique', () => {
    expect(
      similarityPlace(
        lost({ placeId: null, neighborhoodId: 'a' }),
        found({ placeId: null, neighborhoodId: 'b' }),
      ),
    ).toBe(0.4);
  });

  it('vaut 0,5 quand les deux lieux sont totalement inconnus', () => {
    // Ni lieu, ni quartier, ni ville : les deux déclarations ne portent aucune
    // information de lieu. Le signal est neutre — le pays seul ne suffit pas.
    expect(
      similarityPlace(
        lost({ placeId: null, neighborhoodId: null, cityId: null }),
        found({ placeId: null, neighborhoodId: null, cityId: null }),
      ),
    ).toBe(0.5);
  });

  it('vaut 0,1 pour deux villes différentes du même pays', () => {
    expect(
      similarityPlace(
        lost({ placeId: null, neighborhoodId: null, cityId: 'city-ndjamena' }),
        found({ placeId: null, neighborhoodId: null, cityId: 'city-moundou' }),
      ),
    ).toBe(0.1);
  });

  it('vaut 0,1 quand une seule des deux déclarations situe l’objet', () => {
    // Une déclaration incomplète perd le bénéfice du lieu précis, mais reste dans
    // le même pays : elle n'est pas punie d'un zéro.
    expect(
      similarityPlace(
        lost({ placeId: null, neighborhoodId: null, cityId: null }),
        found({ placeId: 'place-marche-central', neighborhoodId: 'nb-moursal' }),
      ),
    ).toBe(0.1);
  });
});

describe('similarité — date', () => {
  it('vaut 1 le même jour', () => {
    expect(similarityDate(at('2026-09-19'), at('2026-09-19'))).toBe(1);
  });

  it('décroît linéairement sur 30 jours', () => {
    expect(similarityDate(at('2026-09-19'), at('2026-09-29'))).toBeCloseTo(2 / 3, 5);
    expect(similarityDate(at('2026-09-19'), at('2026-10-19'))).toBe(0);
  });

  it('vaut 0 si l’objet est trouvé avant la perte', () => {
    expect(similarityDate(at('2026-09-20'), at('2026-09-15'))).toBe(0);
  });
});

describe('similarité — couleur', () => {
  it('vaut 1 pour des couleurs identiques', () => {
    expect(similarityColor('noir', 'BLACK')).toBe(1);
  });

  it('vaut 0 pour des couleurs différentes', () => {
    expect(similarityColor('noir', 'blanc')).toBe(0);
  });

  it('vaut 0,5 quand une couleur est inconnue', () => {
    expect(similarityColor(null, 'noir')).toBe(0.5);
    expect(similarityColor('chartreuse', 'noir')).toBe(0.5);
  });
});

describe('similarité — marque', () => {
  it('vaut 1 pour des marques identiques après normalisation', () => {
    expect(similarityBrand('Tecno', 'tecno')).toBe(1);
    expect(similarityBrand('Samsung', 'SAMSUNG')).toBe(1);
  });

  it('vaut 0,6 pour une faute de frappe légère', () => {
    // « samsng » (une lettre manquante) donne une similarité de 6/11 ≈ 0,55 :
    // dans la bande 0,50 – 0,80, donc un score partiel et non un score nul.
    expect(similarityBrand('Samsung', 'samsng')).toBe(0.6);
  });

  it('vaut 0,5 si l’une des marques est absente', () => {
    expect(similarityBrand(null, 'Tecno')).toBe(0.5);
  });

  it('vaut 0 pour des marques sans rapport', () => {
    expect(similarityBrand('Tecno', 'Apple')).toBe(0);
  });
});

describe('similarité — description', () => {
  it('vaut 0,5 quand les deux descriptions sont vides', () => {
    expect(similarityDescription(null, '')).toBe(0.5);
  });

  it('vaut 0,3 quand une seule est renseignée', () => {
    expect(similarityDescription('rayure sur l’écran', null)).toBe(0.3);
  });

  it('détecte les détails communs malgré les fautes', () => {
    expect(
      similarityDescription(
        'coque bleue avec autocollant sur l’écran',
        'coque bleu avec autocollant sur l ecran',
      ),
    ).toBeGreaterThan(0.8);
  });
});

/* -------------------------------------------------------------------------- */
/* Utilitaires texte                                                           */
/* -------------------------------------------------------------------------- */

describe('utilitaires texte', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(tokens('Écran rayé, coque BLEUE !')).toEqual(['ecran', 'raye', 'coque', 'bleue']);
  });

  it('extrait les trigrammes à la manière de pg_trgm', () => {
    // « carte » est encadré de deux espaces avant et d'un espace après : «   carte » (8 caractères)
    // → 6 fenêtres de 3 caractères, toutes distinctes.
    expect(trigrams('carte').size).toBe(6);
    expect([...trigrams('carte')]).toEqual(['  c', ' ca', 'car', 'art', 'rte', 'te ']);
  });

  it('similarité par trigrammes : 1 pour des chaînes identiques, 0 pour du vide', () => {
    expect(trigramSimilarity('telephone', 'telephone')).toBe(1);
    expect(trigramSimilarity('', 'telephone')).toBe(0);
    expect(trigramSimilarity('telephone', 'ordinateur')).toBeLessThan(0.2);
  });

  it('Jaccard retourne 0 si un ensemble est vide', () => {
    expect(jaccard([], ['a'])).toBe(0);
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1);
  });

  it('normalise les couleurs libres vers les codes canoniques', () => {
    expect(normalizeColor('noire')).toBe('BLACK');
    expect(normalizeColor('Black')).toBe('BLACK');
    expect(normalizeColor('dorée')).toBe('GOLD');
    expect(normalizeColor('bleu marine')).toBe('BLUE');
    expect(normalizeColor('vert foncé')).toBe('GREEN');
    expect(normalizeColor(null)).toBe('UNKNOWN');
    expect(normalizeColor('chartreuse')).toBe('UNKNOWN');
  });

  it('reconnaît un qualificatif libre accolé à une couleur', () => {
    // Repli mot à mot : le premier mot reconnu gagne, le qualificatif est ignoré.
    expect(normalizeColor('gris anthracite')).toBe('GREY');
    expect(normalizeColor('bleu ciel')).toBe('BLUE');
    expect(normalizeColor('rouge cerise')).toBe('RED');
    expect(normalizeColor('  VERT   bouteille  ')).toBe('GREEN');
  });
});

/* -------------------------------------------------------------------------- */
/* Niveaux                                                                     */
/* -------------------------------------------------------------------------- */

describe('niveaux de correspondance', () => {
  it('applique les seuils 90 / 70', () => {
    expect(levelFromScore(100)).toBe('VERY_LIKELY');
    expect(levelFromScore(90)).toBe('VERY_LIKELY');
    expect(levelFromScore(89.99)).toBe('POSSIBLE');
    expect(levelFromScore(70)).toBe('POSSIBLE');
    expect(levelFromScore(69.99)).toBe('WEAK');
    expect(levelFromScore(0)).toBe('WEAK');
  });
});
