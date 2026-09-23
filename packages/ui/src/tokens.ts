/**
 * Liguita — jetons du design system (tokens).
 *
 * ⚠️ SOURCE DE VÉRITÉ DU DESIGN SYSTEM.
 *
 * Ces valeurs sont dupliquées à l'identique dans `tailwind.preset.cjs`, qui est consommé
 * par Tailwind au moment du build (fichier CommonJS pour éviter toute étape de compilation).
 * Le test `__tests__/tokens-parity.test.ts` vérifie que les deux restent synchronisés :
 * toute divergence fait échouer la CI.
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §2
 */

/* -------------------------------------------------------------------------- */
/* Couleur                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Échelle de marque.
 *
 * Le rouge réel du logo est `#F10F15`, mais il échoue au seuil WCAG AA de 4,5:1
 * sur fond blanc (4,36:1) : un bouton blanc sur ce rouge serait non conforme.
 * `brand.500 = #E50F1A` est retenu comme rouge d'interface (4,76:1, conforme) et se
 * situe à une distance colorimétrique imperceptible du logo.
 *
 * `#FF3830`, proposé par la maquette, est écarté : 3,58:1, nettement non conforme.
 */
export const brand = {
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
} as const;

/** Rouge brut du logo — réservé à l'image de marque, jamais au texte ni aux boutons. */
export const LOGO_RED = '#F10F15';

/**
 * Rouge vif de la maquette Home + Dashboard (`#FF3330`).
 *
 * ⚠️ **Décoratif uniquement.** Mesuré à **3,64:1** avec du texte blanc, il est sous le
 * seuil WCAG AA de 4,5:1 (SC 1.4.3). Il ne porte donc jamais de libellé : il sert aux
 * aplats, aux dégradés, aux illustrations et aux traits d'accent, là où aucune
 * information n'est transmise par le texte.
 *
 * Pour tout élément portant du texte — bouton, lien, badge — c'est `brand[500]`
 * (`#E50F1A`, 4,76:1) qui s'applique. L'écart entre les deux rouges est à la limite
 * du perceptible, l'identité visuelle reste donc celle de la maquette.
 *
 * Arbitrage validé par le commanditaire (option « Hybride »).
 */
export const BRAND_BRIGHT = '#FF3330';

/** Rouge vif à l'état survolé — même rôle décoratif que `BRAND_BRIGHT`. */
export const BRAND_BRIGHT_HOVER = '#E52522';

/** Échelle de neutres. Une vraie rampe continue à 9 pas, nécessaire aux états d'interface. */
export const ink = {
  0: '#FFFFFF',
  50: '#F7F8FA',
  100: '#EEF1F5',
  200: '#DEE3EA',
  300: '#B7BEC9',
  400: '#8A929E',
  500: '#5B6470',
  700: '#2A2F38',
  900: '#0E1116',
} as const;

/* -------------------------------------------------------------------------- */
/* Bordures — deux rôles, deux jetons                                          */
/* -------------------------------------------------------------------------- */

/**
 * Bordure des composants interactifs : champ de saisie, bouton secondaire, badge
 * contour, case d'un code à usage unique.
 *
 * ⚠️ **Correction apportée au plan v3.** Le plan désignait `ink.300` (`#B7BEC9`) comme
 * « bordure de champ de saisie » tout en exigeant, au §2.10, un contraste ≥ 3:1 pour les
 * composants d'interface. Les deux prescriptions sont incompatibles : mesuré sur fond
 * blanc, `ink.300` atteint **1,87:1**, très en dessous du seuil WCAG 2.2 SC 1.4.11
 * (niveau AA, engagement du projet).
 *
 * `ink.400` (`#8A929E`) est le premier pas de la rampe qui satisfasse l'exigence :
 * **3,14:1**. C'est donc lui, et non `ink.300`, qui porte les bordures de champ.
 */
export const BORDER_INTERACTIVE = ink[400];

/**
 * Bordure décorative : séparateurs, contours de carte, connecteurs d'étapes.
 * Aucune exigence de contraste — ces éléments ne servent pas à identifier un composant
 * mais à structurer la page.
 */
export const BORDER_DECORATIVE = ink[200];


/**
 * Couleurs sémantiques.
 *
 * ⚠️ `success.500` et `warning.500` ont un contraste insuffisant pour du texte
 * (3,30:1 et 2,15:1). Ils sont réservés aux icônes, aux fonds et aux barres.
 * Le texte utilise `success.700` (7,13:1) et `warning.700` (7,09:1).
 */
export const success = { 50: '#DCFCE7', 500: '#16A34A', 700: '#166534' } as const;
export const warning = { 50: '#FEF3C7', 500: '#F59E0B', 700: '#92400E' } as const;
export const danger = { 50: '#FEE2E2', 500: '#DC2626', 700: '#991B1B' } as const;
export const info = { 50: '#EFF6FF', 500: '#2563EB', 700: '#1D4ED8' } as const;

/**
 * Sémantique métier — à préférer partout aux noms de couleur.
 * `semantic.lost`, `semantic.found`, etc.
 */
export const semantic = {
  lost: brand[500],
  lostBg: brand[50],
  lostText: brand[700],
  found: success[700],
  foundBg: success[50],
  pending: warning[700],
  pendingBg: warning[50],
  settled: ink[500],
  settledBg: ink[50],
  money: ink[900],
} as const;

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Rôles de surface, demandés par la maquette Home + Dashboard.
 *
 * ⚠️ Ces jetons **ne créent pas de nouvelles couleurs** : ils nomment des usages en
 * réutilisant la rampe existante. La maquette proposait `#F9FAFB` pour le fond de page
 * et `#E5E7EB` pour la bordure, valeurs à deux unités près de `ink[50]` (`#F7F8FA`) et
 * `ink[200]` (`#DEE3EA`). Introduire ces quasi-doublons créerait deux jetons pour un
 * même rôle — la garantie la plus sûre qu'ils finiront par diverger.
 *
 * Les deux teintes `lost` et `found` sont en revanche de vraies nouvelles couleurs :
 * elles viennent de la maquette (`#FFF0F0`, `#EAF8F1`) et sont plus douces que
 * `brand[50]` et `success[50]`, ce qui convient mieux à de grandes cartes d'action.
 */
export const surface = {
  /** Fond de page général. */
  page: ink[50],
  /** Fond d'une carte posée sur la page. */
  card: ink[0],
  /** Fond d'un bloc secondaire posé sur une carte. */
  muted: ink[100],
  /** Teinte de la carte « J'ai perdu un objet ». */
  lost: '#FFF0F0',
  /** Teinte de la carte « J'ai trouvé un objet ». Le vert signale l'action « trouvé ». */
  found: '#EAF8F1',
} as const;

/* -------------------------------------------------------------------------- */
/* Typographie                                                                 */
/* -------------------------------------------------------------------------- */

export const fontFamily = {
  display: ['var(--font-plus-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
  body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
} as const;

/**
 * Échelle typographique fluide.
 *
 * Les bornes viennent de deux sources qui se contredisaient : les boards HTML fournissent
 * les valeurs desktop, la maquette fournit les valeurs mobiles. `clamp()` réconcilie les
 * deux — un seul jeton, aucune media query typographique.
 */
export const fontSize = {
  display: 'clamp(2.5rem, 6vw, 4rem)',
  h1: 'clamp(1.75rem, 4vw, 2.5rem)',
  h2: 'clamp(1.375rem, 3vw, 1.75rem)',
  h3: 'clamp(1.125rem, 2vw, 1.25rem)',
  'body-lg': 'clamp(1rem, 1.6vw, 1.125rem)',
  body: 'clamp(0.9375rem, 1.4vw, 1rem)',
  caption: 'clamp(0.75rem, 1.2vw, 0.8125rem)',
  overline: '0.6875rem',
  money: 'clamp(1.125rem, 2.4vw, 1.5rem)',
  'money-lg': 'clamp(2rem, 5vw, 2.75rem)',
} as const;

/* -------------------------------------------------------------------------- */
/* Espacement, rayons, ombres                                                  */
/* -------------------------------------------------------------------------- */

/** Espacement sur une base de 4 px. */
export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px',
} as const;

/**
 * Rayons. Les boutons CTA utilisent `full` (pilule) : cela prolonge la rondeur du logo
 * et distingue nettement l'action principale des champs (12 px) et des cartes (16 px).
 */
export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '999px',
} as const;

export const boxShadow = {
  100: '0 1px 2px rgba(14,17,22,.06), 0 1px 1px rgba(14,17,22,.04)',
  200: '0 4px 12px rgba(14,17,22,.08), 0 2px 4px rgba(14,17,22,.04)',
  300: '0 12px 32px rgba(14,17,22,.10), 0 4px 8px rgba(14,17,22,.05)',
  overlay: '0 20px 60px rgba(14,17,22,.18), 0 8px 16px rgba(14,17,22,.08)',
  focus: '0 0 0 4px rgba(14,17,22,.08)',
  'focus-danger': '0 0 0 4px rgba(229,15,26,.18)',
  'focus-inverse': '0 0 0 4px rgba(255,255,255,.35)',
} as const;

/* -------------------------------------------------------------------------- */
/* Mise en page                                                                */
/* -------------------------------------------------------------------------- */

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

/** Conteneur maximal du contenu. */
export const CONTAINER_MAX_WIDTH = '1200px';

/**
 * Hauteur minimale d'une cible tactile.
 * Exigence d'accessibilité : 48 px, y compris les icônes de barre d'action.
 */
export const TOUCH_TARGET_MIN = '48px';

/* -------------------------------------------------------------------------- */
/* Échelle de référence                                                        */
/* -------------------------------------------------------------------------- */

export const tokens = {
  brand,
  brandBright: BRAND_BRIGHT,
  brandBrightHover: BRAND_BRIGHT_HOVER,
  ink,
  surface,
  success,
  warning,
  danger,
  info,
  semantic,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  boxShadow,
  breakpoints,
  borderInteractive: BORDER_INTERACTIVE,
  borderDecorative: BORDER_DECORATIVE,
  containerMaxWidth: CONTAINER_MAX_WIDTH,
  touchTargetMin: TOUCH_TARGET_MIN,
} as const;

export type Tokens = typeof tokens;
