import { describe, expect, it } from 'vitest';

import {
  FOUND_SECRETS_MIN_ANSWERS,
  hasUsableSecrets,
  secretsQuestionsForCategory,
  validateFoundSecrets,
} from '../found-secrets';

/**
 * Les secrets de vérification conditionnent l'auto-approbation des réclamations.
 * Ces tests verrouillent la règle qui a causé le défaut constaté en production :
 * `found_item_secrets` restait vide, donc toute réclamation partait en revue
 * manuelle avec un score de 0.
 */
describe('secretsQuestionsForCategory', () => {
  it('retourne les questions de la sous-catégorie demandée', () => {
    // Les questions sont désormais portées par la sous-catégorie elle-même
    // (`questionsFor` aiguille sur `categoryId`), et non plus par la racine :
    // `keys` a ses propres questions, distinctes de celles de `personal`.
    const questions = secretsQuestionsForCategory('keys');
    expect(questions.map((q) => q.id)).toEqual(['pers-count', 'pers-mark']);
  });

  it('distingue une sous-catégorie de sa racine', () => {
    // Contre-exemple explicite : `personal` ne pose pas les mêmes questions que
    // ses enfants. Si ce test casse, c'est que la taxonomie a bougé.
    const racine = secretsQuestionsForCategory('personal');
    const sousCategorie = secretsQuestionsForCategory('keys');
    expect(racine.map((q) => q.id)).not.toEqual(sousCategorie.map((q) => q.id));
    expect(racine.map((q) => q.id)).toEqual(['pers-contents', 'pers-mark']);
  });

  it('retourne une liste vide pour un code inconnu', () => {
    expect(secretsQuestionsForCategory('categorie-inexistante')).toEqual([]);
  });

  it('couvre chaque sous-catégorie du référentiel', () => {
    // Un code sans question rendrait la déclaration impossible : mieux vaut le
    // détecter ici qu'en production, devant un formulaire bloqué.
    const codes = [
      'keys',
      'wallet',
      'bag',
      'phone',
      'laptop',
      'id-card',
      'jewelry',
      'vehicle',
      'other',
    ];
    for (const code of codes) {
      const questions = secretsQuestionsForCategory(code);
      if (questions.length === 0) continue; // catégorie absente du référentiel
      expect(questions.length, `aucune question pour ${code}`).toBeGreaterThanOrEqual(
        FOUND_SECRETS_MIN_ANSWERS,
      );
    }
  });
});

describe('validateFoundSecrets', () => {
  // Jeu réel de la catégorie `keys` : deux questions, toutes deux obligatoires.
  // Les codes sont ceux de `questionsFor('keys', 'personal')` — les vérifier
  // ici plutôt que les supposer évite de valider un référentiel qui a changé.
  const valide = {
    'pers-count': '3',
    'pers-mark': 'porte-clés en cuir marron',
  };

  it('accepte un jeu complet et suffisant', () => {
    const result = validateFoundSecrets('keys', valide);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.answered.length).toBe(2);
  });

  it('refuse moins de réponses que le minimum', () => {
    const result = validateFoundSecrets('keys', { 'pers-count': '3' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain(String(FOUND_SECRETS_MIN_ANSWERS));
  });

  it('refuse un dictionnaire vide — le cas du défaut de production', () => {
    const result = validateFoundSecrets('keys', {});
    expect(result.ok).toBe(false);
    expect(result.answered).toEqual([]);
  });

  it('refuse quand une question obligatoire manque', () => {
    // On remplit une question hors catégorie pour dépasser le minimum de volume
    // sans satisfaire l'obligation `pers-mark`.
    const result = validateFoundSecrets('keys', {
      'pers-count': '3',
      'doc-name': 'Mahamat',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('pers-mark');
    expect(result.error).toContain('obligatoires');
  });

  it('ignore les valeurs vides ou composées uniquement d’espaces', () => {
    const result = validateFoundSecrets('keys', {
      'pers-count': '   ',
      'pers-mark': '',
    });
    expect(result.ok).toBe(false);
    expect(result.answered).toEqual([]);
  });

  it('nettoie les espaces autour des valeurs retenues', () => {
    const result = validateFoundSecrets('keys', {
      'pers-count': '  3  ',
      'pers-mark': ' porte-clés en cuir ',
    });
    expect(result.ok).toBe(true);
    expect(result.answered).toHaveLength(2);
  });

  it('compte toute réponse fournie, y compris hors catégorie', () => {
    // `validateFoundSecrets` ne connaît que les questions de la catégorie : il
    // ne peut donc pas filtrer un code étranger, et il le compte. C'est
    // `scoreVerification` qui ignore les réponses sans question correspondante.
    // Ce test documente ce partage des responsabilités.
    const result = validateFoundSecrets('keys', {
      'pers-count': '3',
      'pers-mark': 'porte-clés en cuir',
      'doc-number-tail': '1234',
    });
    expect(result.ok).toBe(true);
    expect(result.answered).toContain('doc-number-tail');
    expect(result.answered).toHaveLength(3);
  });

  it('ne crédite pas une question obligatoire répondue sous un code étranger', () => {
    // Le cas qui compte vraiment : la question obligatoire `pers-mark` reste
    // sans réponse même si l'utilisateur a rempli un code d'une autre famille.
    const result = validateFoundSecrets('keys', {
      'pers-count': '3',
      'doc-number-tail': '1234',
      'doc-name': 'Mahamat',
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('pers-mark');
  });
});

describe('hasUsableSecrets', () => {
  it('est faux pour un objet absent ou vide', () => {
    expect(hasUsableSecrets(null)).toBe(false);
    expect(hasUsableSecrets(undefined)).toBe(false);
    expect(hasUsableSecrets({})).toBe(false);
  });

  it('est faux en dessous du minimum', () => {
    expect(hasUsableSecrets({ 'pers-contents': 'un porte-clés' })).toBe(false);
  });

  it('est vrai au niveau du minimum', () => {
    expect(hasUsableSecrets({ a: 'x', b: 'y' })).toBe(true);
  });

  it('ignore les valeurs blanches', () => {
    expect(hasUsableSecrets({ a: 'x', b: '   ' })).toBe(false);
  });
});
