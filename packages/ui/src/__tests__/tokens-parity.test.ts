/**
 * Parité entre `src/tokens.ts` et `tailwind.preset.cjs`, et invariants d'accessibilité.
 *
 * Le design system est dupliqué à dessein : `tailwind.preset.cjs` est chargé par Tailwind
 * au moment du build et ne peut pas être un module TypeScript. Cette duplication est
 * assumée parce qu'elle est **vérifiée** — c'est tout l'objet de ce fichier.
 *
 * Sans ce test, une valeur corrigée dans `tokens.ts` et oubliée dans le preset produit
 * un écart invisible : un composant qui consomme la classe `bg-brand-500` n'affiche pas
 * la même couleur que celui qui importe `brand[500]` depuis les jetons. Un écart de ce
 * type se découvre en production, sur une capture d'écran de client.
 *
 * La seconde moitié du fichier mesure les contrastes réels. Elle a déjà servi : c'est
 * elle qui a mis au jour le fait que `ink.300`, désigné « bordure de champ de saisie »
 * par le plan v3, n'atteint que 1,87:1 et ne peut pas tenir ce rôle.
 */

import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import {
  BORDER_DECORATIVE,
  BORDER_INTERACTIVE,
  LOGO_RED,
  borderRadius,
  boxShadow,
  brand,
  breakpoints,
  danger,
  fontSize,
  fontFamily,
  info,
  ink,
  spacing,
  success,
  warning,
} from '../tokens';

interface TailwindPreset {
  theme: { extend: Record<string, Record<string, unknown>> };
}

const require = createRequire(import.meta.url);
const { liguitaPreset } = require('../../tailwind.preset.cjs') as {
  liguitaPreset: TailwindPreset;
};

const extend = liguitaPreset.theme.extend;

/** Contraste WCAG 2.2 entre deux couleurs hexadécimales, entre 1 et 21. */
function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string): number => {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map((offset) => {
      const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return (
      0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
    );
  };

  const values = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  const lighter = values[0] ?? 0;
  const darker = values[1] ?? 0;
  return (lighter + 0.05) / (darker + 0.05);
}

describe('parité jetons ↔ preset Tailwind', () => {
  it('expose les mêmes échelles de couleur', () => {
    // `toMatchObject` autorise le preset à porter des clés supplémentaires
    // (`brand.DEFAULT`, qui n'existe pas dans les jetons).
    expect(extend.colors).toMatchObject({ brand, ink, success, warning, danger, info });
  });

  it('expose la même couleur de marque par défaut', () => {
    const colors = extend.colors as Record<string, Record<string, unknown>>;
    expect(colors.brand?.DEFAULT).toBe(brand[500]);
  });

  it('expose les mêmes familles de police', () => {
    expect(extend.fontFamily).toEqual(fontFamily);
  });

  it('expose la même échelle typographique', () => {
    // Tailwind attend `[taille, options]` : on ne compare que la taille.
    const entries = Object.entries(extend.fontSize as Record<string, [string, unknown]>);
    const sizes = Object.fromEntries(entries.map(([key, value]) => [key, value[0]]));
    expect(sizes).toEqual(fontSize);
  });

  it('expose les mêmes rayons', () => {
    expect(extend.borderRadius).toEqual(borderRadius);
  });

  it('expose les mêmes ombres', () => {
    expect(extend.boxShadow).toEqual(boxShadow);
  });

  it('expose les mêmes espacements', () => {
    expect(extend.spacing).toEqual(spacing);
  });

  it('expose les mêmes points de rupture', () => {
    expect(extend.screens).toEqual(breakpoints);
  });

  it('expose la même largeur de conteneur', () => {
    expect(extend.maxWidth).toEqual({ container: '1200px' });
  });

  it('expose la même cible tactile minimale', () => {
    // 48 px est un plancher d'accessibilité, pas une préférence esthétique.
    expect(extend.minHeight).toEqual({ touch: '48px' });
    expect(extend.minWidth).toEqual({ touch: '48px' });
  });
});

describe('jetons — invariants d’accessibilité', () => {
  it('réserve les bordures interactives au pas conforme de la rampe', () => {
    expect(BORDER_INTERACTIVE).toBe(ink[400]);
    expect(BORDER_DECORATIVE).toBe(ink[200]);
  });

  it('garantit 3:1 pour la bordure des composants interactifs', () => {
    // WCAG 2.2 SC 1.4.11 (AA) : un champ de saisie doit être identifiable.
    // Mesuré : #8A929E sur blanc = 3,14:1.
    expect(contrastRatio(BORDER_INTERACTIVE, ink[0])).toBeGreaterThanOrEqual(3);
  });

  it('documente que ink.300 ne peut pas porter une bordure interactive', () => {
    // C'est la correction apportée au plan v3 : #B7BEC9 sur blanc = 1,87:1.
    // Ce test empêche un retour en arrière involontaire vers cette valeur.
    expect(contrastRatio(ink[300], ink[0])).toBeLessThan(3);
  });

  it('garantit le seuil AA de 4,5:1 pour le texte blanc sur la marque', () => {
    // Raison d'être de `brand.500 = #E50F1A` : 4,76:1.
    expect(contrastRatio('#FFFFFF', brand[500])).toBeGreaterThanOrEqual(4.5);
  });

  it('documente l’écart du rouge brut du logo', () => {
    // Le rouge réel du logo (#F10F15) n'atteint que 4,36:1 : un bouton à libellé blanc
    // posé dessus serait non conforme. Il reste réservé à l'image de marque.
    expect(contrastRatio('#FFFFFF', LOGO_RED)).toBeLessThan(4.5);
  });

  it('garantit le seuil AA pour le texte foncé sur les fonds sémantiques', () => {
    expect(contrastRatio(success[700], success[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(warning[700], warning[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(danger[700], danger[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(info[700], info[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(brand[700], brand[50])).toBeGreaterThanOrEqual(4.5);
  });

  it('garantit le seuil AA pour le texte courant sur fond blanc', () => {
    // `ink.500` est le pas le plus clair autorisé pour du texte : 6,00:1.
    expect(contrastRatio(ink[500], ink[0])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ink[700], ink[0])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ink[900], ink[0])).toBeGreaterThanOrEqual(4.5);
  });

  it('documente que ink.400 est réservé aux bordures, jamais au texte', () => {
    // 3,14:1 : suffisant pour un composant d'interface, insuffisant pour du texte.
    expect(contrastRatio(ink[400], ink[0])).toBeLessThan(4.5);
  });

  it('documente que les accents sémantiques 500 ne conviennent pas au texte', () => {
    // 3,30:1 et 2,15:1. Ils sont réservés aux icônes, aux fonds et aux barres.
    expect(contrastRatio(success[500], '#FFFFFF')).toBeLessThan(4.5);
    expect(contrastRatio(warning[500], '#FFFFFF')).toBeLessThan(4.5);
  });
});
