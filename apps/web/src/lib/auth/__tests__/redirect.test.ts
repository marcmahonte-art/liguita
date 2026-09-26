import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from '../redirect';

/**
 * Le paramètre `?redirect=` arrive de l'URL. Sans validation, `/connexion?redirect=//evil.example`
 * transforme la page de connexion d'un service de restitution d'objets perdus en une
 * ouverture vers n'importe quel site — et l'utilisateur arrive ici avec une session
 * valide en main.
 */
describe('safeRedirectPath', () => {
  it('accepte un chemin interne', () => {
    expect(safeRedirectPath('/app')).toBe('/app');
    expect(safeRedirectPath('/declarer/perdu')).toBe('/declarer/perdu');
    expect(safeRedirectPath('/app/annonces?q=perdu&ville=ndjamena')).toBe(
      '/app/annonces?q=perdu&ville=ndjamena',
    );
  });

  it('refuse une URL absolue', () => {
    expect(safeRedirectPath('//evil.example')).toBe('/app');
    expect(safeRedirectPath('https://evil.example')).toBe('/app');
    expect(safeRedirectPath('http://evil.example/steal')).toBe('/app');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/app');
  });

  it('refuse un chemin qui le navigateur lirait comme une URL', () => {
    expect(safeRedirectPath('/\\evil.example')).toBe('/app');
    expect(safeRedirectPath('/\t/evil.example')).toBe('/app');
  });

  it('retombe sur la destination par défaut', () => {
    expect(safeRedirectPath(null)).toBe('/app');
    expect(safeRedirectPath(undefined)).toBe('/app');
    expect(safeRedirectPath('')).toBe('/app');
    expect(safeRedirectPath('   ')).toBe('/app');
    expect(safeRedirectPath('app/objets')).toBe('/app');
  });

  it('respecte la destination de repli fournie', () => {
    expect(safeRedirectPath(null, '/')).toBe('/');
    expect(safeRedirectPath('//evil.example', '/')).toBe('/');
  });

  it('borne la longueur', () => {
    expect(safeRedirectPath(`/${'a'.repeat(5000)}`)).toBe('/app');
  });
});
