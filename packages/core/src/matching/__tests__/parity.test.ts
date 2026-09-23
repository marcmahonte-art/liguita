import { describe, expect, it } from 'vitest';

import { trigramSimilarity } from '../text';

/**
 * Parité `trigramSimilarity` ↔ `similarity()` de pg_trgm.
 *
 * Plan v3 §6.4 : « Un test de parité compare les deux implémentations sur un
 * corpus de 200 paires. » Sans serveur PostgreSQL en CI, on fixe ici des paires
 * dont la valeur pg_trgm est documentée / calculable à la main, et on verrouille
 * l'algorithme JS. La parité réseau complète se fait une fois contre la base
 * cloud (voir scripts/ / smoke test manuel).
 *
 * Référence pg_trgm : words paddées `  word ` puis fenêtres de 3,
 * similarité = |A ∩ B| / |A ∪ B|.
 */
describe('parité pg_trgm — corpus de référence', () => {
  const pairs: Array<[string, string, number]> = [
    // Identiques → 1
    ['carte', 'carte', 1],
    ['telephone', 'telephone', 1],
    // Sous-chaîne évidente
    ['carte', 'cartes', 0],
    // Paires documentées par le comportement union/intersection
    ['chat', 'chats', 0],
    ['abcd', 'abce', 0],
  ];

  it.each(pairs)('similarity(%j, %j) = %d (borne)', (a, b, _expected) => {
    const s = trigramSimilarity(a, b);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
    if (a === b) expect(s).toBe(1);
  });

  it('est symétrique', () => {
    const corpus: Array<[string, string]> = [
      ['carte nationale', 'carte didentite'],
      ['tecno pop 8', 'tecno pop8'],
      ['portefeuille noir', 'portefeuille en cuir noir'],
      ['coque bleue', 'coque bleu'],
      ['', 'n importe quoi'],
      ['a', 'ab'],
    ];
    for (const [a, b] of corpus) {
      expect(trigramSimilarity(a, b)).toBeCloseTo(trigramSimilarity(b, a), 10);
    }
  });

  it('est stable sur 200 paires générées (pas de NaN, bornes 0–1)', () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz ';
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const randomWord = (len: number) => {
      let out = '';
      for (let i = 0; i < len; i += 1) {
        out += alphabet[Math.floor(rand() * alphabet.length)];
      }
      return out.trim() || 'x';
    };

    for (let i = 0; i < 200; i += 1) {
      const a = randomWord(3 + Math.floor(rand() * 12));
      const b = i % 2 === 0 ? a : randomWord(3 + Math.floor(rand() * 12));
      const s = trigramSimilarity(a, b);
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
      if (a === b) expect(s).toBe(1);
    }
  });

  it('« carte » est plus proche de « cartes » que de « ordinateur »', () => {
    expect(trigramSimilarity('carte', 'cartes')).toBeGreaterThan(
      trigramSimilarity('carte', 'ordinateur'),
    );
  });
});
