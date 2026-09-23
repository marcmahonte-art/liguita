import { describe, expect, it } from 'vitest';

import {
  DESCRIPTION_PREVIEW_MAX,
  FORBIDDEN_PUBLIC_KEYS,
  toPublicItem,
  toPublicItems,
  type FoundItemLike,
} from '../search';

/**
 * Sprint 3 — test 3.7 : aucune donnée personnelle dans la réponse réseau.
 *
 * Verrouille `toPublicItem` : c'est le seul passage autorisé entre une ligne
 * base et la forme rendue au navigateur (liste, carte, pagination).
 */

const FULL_DESCRIPTION =
  'Carte d’identité trouvée près du marché, au nom de Moussa Abdelkerim, ' +
  'délivrée le 12/03/2024, avec un numéro de téléphone 66 12 34 56 ' +
  'et une adresse au quartier Farcha à N’Djamena — contenu trop long.';

/** Aperçu tel que la vue SQL le renvoie : tronqué, sans PII ni description complète. */
const SAFE_PREVIEW =
  'Carte d’identité trouvée près du marché, déposée à l’accueil — aperçu public.';

const SAMPLE_RAW_ROW: FoundItemLike = {
  id: '3f0a1c2e-0000-4000-8000-000000000001',
  finder_id: '3f0a1c2e-0000-4000-8000-00000000dead',
  user_id: '3f0a1c2e-0000-4000-8000-00000000beef',
  category_code: 'doc-national-id',
  item_type_code: 'national-id-card',
  title: 'Carte nationale',
  description: FULL_DESCRIPTION,
  description_preview: SAFE_PREVIEW,
  brand: null,
  color: 'bleu',
  city_slug: 'ndjamena',
  neighborhood_slug: 'farcha',
  place_label: 'Marché de Moursal',
  found_at: '2026-09-20T09:00:00.000Z',
  status: 'FOUND',
  created_at: '2026-09-20T10:00:00.000Z',
  photo_count: 2,
  phone: '+23566123456',
  phone_number: '+23566123456',
  full_name: 'Moussa Abdelkerim',
  display_name: 'Moussa A.',
  avatar_url: 'https://cdn.example.com/avatars/moussa.png',
  email: 'moussa@example.com',
  address: 'Quartier Farcha, N’Djamena',
  lat: 12.114,
  lng: 15.057,
  latitude: 12.114,
  longitude: 15.057,
  search_vector: "'carte':1 'identite':4",
  next_cursor_found_at: '2026-09-20T09:00:00.000Z',
  next_cursor_id: '3f0a1c2e-0000-4000-8000-000000000002',
};

describe('toPublicItem', () => {
  it('conserve uniquement les colonnes publiques autorisées', () => {
    const publicItem = toPublicItem(SAMPLE_RAW_ROW);

    expect(publicItem).toMatchObject({
      id: SAMPLE_RAW_ROW.id,
      title: 'Carte nationale',
      category_code: 'doc-national-id',
      place_label: 'Marché de Moursal',
      status: 'FOUND',
      photo_count: 2,
    });
  });

  it('ne contient aucune clé interdite (PII / identifiants)', () => {
    const publicItem = toPublicItem(SAMPLE_RAW_ROW);
    const keys = Object.keys(publicItem);

    for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('ne propage jamais les valeurs PII de la ligne source', () => {
    const json = JSON.stringify(toPublicItem(SAMPLE_RAW_ROW));

    expect(json).not.toContain('+23566123456');
    expect(json).not.toContain('Moussa Abdelkerim');
    expect(json).not.toContain('moussa@example.com');
    expect(json).not.toContain(SAMPLE_RAW_ROW.finder_id as string);
    expect(json).not.toContain(SAMPLE_RAW_ROW.user_id as string);
    expect(json).not.toContain('12.114');
    // La description complète (avec nom / adresse) ne doit jamais figurer.
    expect(json).not.toContain('Quartier Farcha, N’Djamena');
    expect(json).not.toContain('numéro de téléphone');
    expect(json).not.toContain(FULL_DESCRIPTION);
  });

  it('borne description_preview à 120 caractères', () => {
    const longPreview = 'x'.repeat(200);
    const publicItem = toPublicItem({ ...SAMPLE_RAW_ROW, description_preview: longPreview });

    expect(publicItem.description_preview).toHaveLength(DESCRIPTION_PREVIEW_MAX);
    expect(DESCRIPTION_PREVIEW_MAX).toBeLessThanOrEqual(120);
  });

  it('tranche aussi un aperçu déjà trop long fourni par la RPC', () => {
    const long = 'y'.repeat(180);
    const publicItem = toPublicItem({ ...SAMPLE_RAW_ROW, description_preview: long });
    expect(publicItem.description_preview).toHaveLength(120);
    expect(DESCRIPTION_PREVIEW_MAX).toBeLessThanOrEqual(120);
  });

  it('accepte description_preview null sans inventer de texte', () => {
    const publicItem = toPublicItem({ ...SAMPLE_RAW_ROW, description_preview: null });
    expect(publicItem.description_preview).toBeNull();
  });

  it('refuse une ligne sans colonnes publiques obligatoires', () => {
    expect(() => toPublicItem({ id: 'only-id' })).toThrow(/incomplète/);
  });
});

describe('toPublicItems', () => {
  it('mappe un lot sans fuite', () => {
    const items = toPublicItems([SAMPLE_RAW_ROW, SAMPLE_RAW_ROW]);
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(Object.keys(item)).not.toEqual(
        expect.arrayContaining(FORBIDDEN_PUBLIC_KEYS as unknown as string[]),
      );
    }
  });
});
