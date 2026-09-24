/**
 * Barème de vérification de propriété (§7.5 du plan).
 *
 * Ces tests verrouillent les seuils de décision : les modifier par inattention
 * ouvrirait ou fermerait des restitutions sans que personne ne s'en aperçoive.
 */

import { describe, expect, it } from 'vitest';

import {
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_REVIEW_THRESHOLD,
  VERIFICATION_THRESHOLD,
  classifyVerification,
  scoreVerification,
  type VerificationQuestion,
} from '../verification-questions';

const QUESTIONS: readonly VerificationQuestion[] = [
  {
    id: 'q1',
    categoryId: 'personal',
    promptFr: 'Contenu ?',
    answerKind: 'text',
    weight: 4,
    isRequired: true,
  },
  {
    id: 'q2',
    categoryId: 'personal',
    promptFr: 'Signe distinctif ?',
    answerKind: 'text',
    weight: 3,
    isRequired: true,
  },
  {
    id: 'q3',
    categoryId: 'personal',
    promptFr: 'Couleur ?',
    answerKind: 'text',
    weight: 3,
    isRequired: false,
  },
];

describe('barème de vérification (§7.5)', () => {
  it('seuils alignés sur le plan', () => {
    expect(VERIFICATION_THRESHOLD).toBe(0.8);
    expect(VERIFICATION_REVIEW_THRESHOLD).toBe(0.5);
    expect(VERIFICATION_MAX_ATTEMPTS).toBe(3);
  });

  it('score ≥ 80 % approuve', () => {
    expect(classifyVerification(0.8)).toBe('APPROVED');
    expect(classifyVerification(1)).toBe('APPROVED');
    expect(classifyVerification(0.95)).toBe('APPROVED');
  });

  it('score 50–79 % part en revue manuelle', () => {
    expect(classifyVerification(0.5)).toBe('UNDER_REVIEW');
    expect(classifyVerification(0.79)).toBe('UNDER_REVIEW');
  });

  it('score < 50 % refuse', () => {
    expect(classifyVerification(0.49)).toBe('REJECTED');
    expect(classifyVerification(0)).toBe('REJECTED');
  });

  it('une bonne réponse complète approuve (DoD Sprint 5)', () => {
    const outcome = scoreVerification(
      QUESTIONS,
      [
        { questionId: 'q1', value: 'Cartes et billets' },
        { questionId: 'q2', value: 'Autocollant bleu' },
        { questionId: 'q3', value: 'Noir' },
      ],
      { q1: 'cartes et billets', q2: 'autocollant bleu', q3: 'noir' },
    );
    expect(outcome.score).toBe(1);
    expect(classifyVerification(outcome.score)).toBe('APPROVED');
    expect(outcome.isSufficient).toBe(true);
  });

  it('ne suffit pas quand une question obligatoire attendue est absente', () => {
    const outcome = scoreVerification(
      QUESTIONS,
      [{ questionId: 'q1', value: 'Cartes et billets' }],
      { q1: 'cartes et billets', q2: 'autocollant bleu', q3: 'noir' },
    );
    expect(outcome.score).toBe(0.4);
    expect(outcome.isSufficient).toBe(false);
  });

  it('normalise casse et accents sans tolérer les fautes de frappe', () => {
    const outcome = scoreVerification(
      QUESTIONS,
      [{ questionId: 'q1', value: 'MAHAMAT' }],
      { q1: 'mahamat' },
    );
    expect(outcome.matchedQuestionIds).toContain('q1');

    const typo = scoreVerification(QUESTIONS, [{ questionId: 'q1', value: 'mahamet' }], {
      q1: 'mahamat',
    });
    expect(typo.matchedQuestionIds).not.toContain('q1');
  });

  it('ne révèle jamais la bonne réponse dans l’outcome', () => {
    const outcome = scoreVerification(QUESTIONS, [{ questionId: 'q1', value: 'xxx' }], {
      q1: 'secret',
    });
    expect(JSON.stringify(outcome)).not.toContain('secret');
  });
});
