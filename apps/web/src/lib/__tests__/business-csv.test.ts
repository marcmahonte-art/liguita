import { describe, expect, it } from 'vitest';

import { parseCsv, parseCsvObjects } from '../business/csv';

describe('parseCsv', () => {
  it('gère les lignes et cellules avec virgules', () => {
    expect(parseCsv('title,place\nCarte,Marché central')).toEqual([
      ['title', 'place'],
      ['Carte', 'Marché central'],
    ]);
  });

  it('gère les guillemets et les doubles guillemets', () => {
    expect(parseCsvObjects('title,notes\n"Carte, nationale","Une ""note"""')).toEqual([
      { title: 'Carte, nationale', notes: 'Une "note"' },
    ]);
  });
});
