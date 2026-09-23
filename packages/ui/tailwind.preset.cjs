/**
 * Liguita — preset Tailwind du design system.
 *
 * ⚠️ Ce fichier est volontairement en CommonJS : Tailwind le charge au moment du build,
 * sans étape de compilation. Les valeurs sont dupliquées à l'identique depuis
 * `src/tokens.ts`, et le test `src/__tests__/tokens-parity.test.ts` vérifie la parité.
 *
 * Usage dans une application :
 *   // tailwind.config.ts
 *   import { liguitaPreset } from '@liguita/ui/tailwind.preset.cjs';
 *   export default { presets: [liguitaPreset], content: [...] };
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §2.8
 */

/** @type {import('tailwindcss').Config} */
const liguitaPreset = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDECEE',
          100: '#FBD5D9',
          200: '#F4A5AD',
          300: '#EC6E7A',
          400: '#E53947',
          500: '#E50F1A',
          600: '#C70D17',
          700: '#A30A12',
          800: '#7E070E',
          900: '#56040A',
          DEFAULT: '#E50F1A',
          /* Rouge vif de la maquette — DÉCORATIF. 3,64:1 avec du blanc : jamais du texte. */
          bright: '#FF3330',
          'bright-hover': '#E52522',
        },
        ink: {
          0: '#FFFFFF',
          50: '#F7F8FA',
          100: '#EEF1F5',
          200: '#DEE3EA',
          300: '#B7BEC9',
          400: '#8A929E',
          500: '#5B6470',
          700: '#2A2F38',
          900: '#0E1116',
        },
        surface: {
          page: '#F7F8FA',
          card: '#FFFFFF',
          muted: '#EEF1F5',
          lost: '#FFF0F0',
          found: '#EAF8F1',
        },
        success: { 50: '#DCFCE7', 500: '#16A34A', 700: '#166534' },
        warning: { 50: '#FEF3C7', 500: '#F59E0B', 700: '#92400E' },
        danger: { 50: '#FEE2E2', 500: '#DC2626', 700: '#991B1B' },
        info: { 50: '#EFF6FF', 500: '#2563EB', 700: '#1D4ED8' },
      },

      fontFamily: {
        display: ['var(--font-plus-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        display: [
          'clamp(2.5rem, 6vw, 4rem)',
          { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' },
        ],
        h1: [
          'clamp(1.75rem, 4vw, 2.5rem)',
          { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '800' },
        ],
        h2: [
          'clamp(1.375rem, 3vw, 1.75rem)',
          { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' },
        ],
        h3: [
          'clamp(1.125rem, 2vw, 1.25rem)',
          { lineHeight: '1.3', letterSpacing: '-0.005em', fontWeight: '700' },
        ],
        'body-lg': ['clamp(1rem, 1.6vw, 1.125rem)', { lineHeight: '1.5' }],
        body: ['clamp(0.9375rem, 1.4vw, 1rem)', { lineHeight: '1.5' }],
        caption: ['clamp(0.75rem, 1.2vw, 0.8125rem)', { lineHeight: '1.4' }],
        overline: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '700' }],
        money: [
          'clamp(1.125rem, 2.4vw, 1.5rem)',
          { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '800' },
        ],
        'money-lg': [
          'clamp(2rem, 5vw, 2.75rem)',
          { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' },
        ],
      },

      borderRadius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '999px',
      },

      boxShadow: {
        100: '0 1px 2px rgba(14,17,22,.06), 0 1px 1px rgba(14,17,22,.04)',
        200: '0 4px 12px rgba(14,17,22,.08), 0 2px 4px rgba(14,17,22,.04)',
        300: '0 12px 32px rgba(14,17,22,.10), 0 4px 8px rgba(14,17,22,.05)',
        overlay: '0 20px 60px rgba(14,17,22,.18), 0 8px 16px rgba(14,17,22,.08)',
        focus: '0 0 0 4px rgba(14,17,22,.08)',
        'focus-danger': '0 0 0 4px rgba(229,15,26,.18)',
        'focus-inverse': '0 0 0 4px rgba(255,255,255,.35)',
      },

      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
        24: '96px',
      },

      maxWidth: {
        container: '1200px',
      },

      minHeight: {
        touch: '48px',
      },

      minWidth: {
        touch: '48px',
      },

      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
};

module.exports = { liguitaPreset };
module.exports.liguitaPreset = liguitaPreset;
