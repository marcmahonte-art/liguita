import { describe, expect, it } from 'vitest';

import { initialsOf } from '@liguita/ui';

import {
  authProviderLabel,
  formatPhone,
  publicNameOf,
  resolveIdentity,
  toAuthProvider,
} from '../identity';

/**
 * Ces tests verrouillent la règle centrale de la refonte : **le nom du détenteur du
 * compte est l'identité affichée, le numéro de téléphone ne l'est pas.**
 *
 * Ils couvrent aussi le cas que l'application ne gérait pas — un compte Google et un
 * compte email qui sont la même personne — et la garantie qu'un tiers ne voit jamais
 * les coordonnées d'un autre membre.
 */
describe('resolveIdentity', () => {
  it('affiche le prénom et le nom saisis à l’inscription', () => {
    const identity = resolveIdentity({
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@gmail.com',
    });

    expect(identity.firstName).toBe('Jean');
    expect(identity.lastName).toBe('Dupont');
    expect(identity.displayName).toBe('Jean Dupont');
    expect(identity.hasRealName).toBe(true);
  });

  it('recompose un nom complet depuis les colonnes séparées de Google', () => {
    const identity = resolveIdentity({
      first_name: 'Jean',
      last_name: 'Dupont',
      full_name: 'Jean Dupont',
      display_name: 'Jean Dupont',
      avatar_url: 'https://lh3.googleusercontent.com/a/photo',
      auth_provider: 'google',
      email: 'jean.dupont@gmail.com',
    });

    expect(identity.displayName).toBe('Jean Dupont');
    expect(identity.avatarUrl).toBe('https://lh3.googleusercontent.com/a/photo');
    expect(identity.authProvider).toBe('GOOGLE');
    expect(identity.initials).toBe('JD');
  });

  it('ne duplique pas un nom complet déjà composé', () => {
    /* Une seule colonne `full_name`, sans first/last : c'est le cas des comptes créés
       avant la refonte. Le découper naïf donnerait « Jean Jean ». */
    const identity = resolveIdentity({ full_name: 'Jean', email: 'jean@example.com' });

    expect(identity.firstName).toBe('Jean');
    expect(identity.lastName).toBeNull();
    expect(identity.displayName).toBe('Jean');
  });

  it('découpe un nom complet à plusieurs mots', () => {
    const identity = resolveIdentity({ full_name: 'Mahamat Abakar Ali' });

    expect(identity.firstName).toBe('Mahamat');
    expect(identity.lastName).toBe('Abakar Ali');
    expect(identity.displayName).toBe('Mahamat Abakar Ali');
  });

  it('préfère le prénom seul à l’email quand aucun nom n’existe', () => {
    const identity = resolveIdentity({
      first_name: 'Jean',
      email: 'jean.dupont@gmail.com',
      phone: '661234567',
    });

    expect(identity.displayName).toBe('Jean');
  });

  it('ne retombe sur l’email qu’en dernier recours, jamais avant le prénom', () => {
    const identity = resolveIdentity({ email: 'jean.dupont@gmail.com', phone: '661234567' });

    expect(identity.displayName).toBe('jean.dupont@gmail.com');
  });

  it('ne retombe sur le numéro de téléphone qu’en tout dernier', () => {
    const identity = resolveIdentity({ phone: '661234567' });

    expect(identity.displayName).toBe('661234567');
    expect(identity.initials).toBe('6');
  });

  it('ne rend jamais un nom vide', () => {
    expect(resolveIdentity({}).displayName).toBe('Membre Liguita');
    expect(resolveIdentity(null).displayName).toBe('Membre Liguita');
    expect(resolveIdentity({ first_name: '   ' }).displayName).toBe('Membre Liguita');
  });

  it('donne toujours des initialales exploitables', () => {
    expect(resolveIdentity({ first_name: 'Jean', last_name: 'Dupont' }).initials).toBe('JD');
    /* Un seul prénom donne une initiale, pas deux : « M », pas « M? ». */
    expect(resolveIdentity({ first_name: 'Mariam' }).initials).toBe('M');
    expect(resolveIdentity({}).initials).toBe('?');
  });

  it('plafonne les initiales à deux lettres, comme le design system', () => {
    /* `<Avatar />` applique la règle de `packages/ui`. Si `resolveIdentity` en
       appliquait une autre, le même nom afficherait deux initiales différentes selon
       l'écran — c'est exactement ce que l'unicité de l'identité interdit. */
    expect(resolveIdentity({ first_name: 'Mahamat', last_name: 'Abakar Ali' }).initials).toBe('MA');
    expect(resolveIdentity({ first_name: 'Jean', last_name: 'Dupont' }).initials).toBe(
      initialsOf('Jean Dupont'),
    );
  });

  it('traite les espaces comme des espaces', () => {
    const identity = resolveIdentity({ first_name: '  Jean  ', last_name: '  Dupont  ' });

    expect(identity.displayName).toBe('Jean Dupont');
  });
});

describe('publicNameOf', () => {
  it('renvoie le nom d’un tiers quand il en a un', () => {
    expect(publicNameOf({ first_name: 'Jean', last_name: 'Dupont' })).toBe('Jean Dupont');
  });

  it('ne divulgue jamais l’email ni le numéro d’un tiers', () => {
    /* Un correspondant n'a pas à recevoir les coordonnées d'un autre membre : le
       repli de `resolveIdentity` s'arrête volontairement avant. */
    expect(publicNameOf({ email: 'jean.dupont@gmail.com' })).toBeNull();
    expect(publicNameOf({ phone: '661234567' })).toBeNull();
  });
});

describe('toAuthProvider', () => {
  it('reconnaît les méthodes connues', () => {
    expect(toAuthProvider('GOOGLE')).toBe('GOOGLE');
    expect(toAuthProvider('google')).toBe('GOOGLE');
    expect(toAuthProvider('email')).toBe('EMAIL');
    expect(toAuthProvider('phone')).toBe('PHONE');
  });

  it('retombe sur EMAIL pour une valeur inconnue', () => {
    expect(toAuthProvider(null)).toBe('EMAIL');
    expect(toAuthProvider('apple')).toBe('EMAIL');
  });
});

describe('authProviderLabel', () => {
  it('ne dit jamais « OAuth » ni « provider »', () => {
    const labels = (['EMAIL', 'GOOGLE', 'PHONE'] as const).map(authProviderLabel);

    for (const label of labels) {
      expect(label).not.toMatch(/oauth|provider|token|jwt/i);
    }
  });
});

describe('formatPhone', () => {
  it('ajoute l’indicatif du pays à un numéro local', () => {
    expect(formatPhone('661234567', 'TD')).toBe('+235 661 234 567');
  });

  it('ne réécrit jamais un numéro déjà international', () => {
    expect(formatPhone('+235661234567')).toBe('+235661234567');
    expect(formatPhone('00235661234567')).toBe('+235661234567');
  });

  it('rend null pour un numéro absent', () => {
    expect(formatPhone(null)).toBeNull();
    expect(formatPhone('   ')).toBeNull();
  });
});
