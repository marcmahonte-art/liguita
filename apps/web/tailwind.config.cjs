/**
 * Tailwind de l'application web.
 *
 * Le thème vient intégralement de `@liguita/ui/tailwind-preset`, qui est la projection du
 * design system. Aucune valeur de couleur, de typographie ou d'espacement n'est écrite ici :
 * ce fichier ne fait que déclarer où trouver les classes et brancher le preset.
 *
 * ⚠️ `content` doit inclure les sources de `packages/ui`. Sans cela, les classes utilisées
 * uniquement à l'intérieur des composants du design system — et nulle part dans
 * `apps/web` — ne seraient jamais générées, et les composants s'afficheraient sans style.
 * C'est la cause la plus fréquente d'un design system « qui marche en Storybook mais pas
 * dans l'application ».
 *
 * ⚠️ Le fichier est en CommonJS (`.cjs`) à dessein : Tailwind le charge au moment du build,
 * sans étape de compilation, et le preset est lui-même en CommonJS pour la même raison.
 */

const { liguitaPreset } = require('@liguita/ui/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [liguitaPreset],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/config/src/**/*.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
