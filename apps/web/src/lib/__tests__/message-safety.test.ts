import { describe, expect, it } from 'vitest';

import { isOffPlatformMessage } from '../moderation/message-safety';

describe('isOffPlatformMessage', () => {
  it('signale un numéro de téléphone', () => {
    expect(isOffPlatformMessage('Appelez-moi au 66 12 34 56')).toBe(true);
  });

  it('signale une invitation explicite hors plateforme', () => {
    expect(isOffPlatformMessage('Rencontrons-nous chez moi demain')).toBe(true);
  });

  it('laisse passer un message de restitution normal', () => {
    expect(isOffPlatformMessage('Je vous rends l’objet demain à 9 h au marché.')).toBe(false);
  });
});
