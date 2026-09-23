/**
 * Liguita — polices auto-hébergées.
 *
 * ⚠️ Aucun appel à `fonts.googleapis.com` ni `fonts.gstatic.com`. Deux raisons :
 *  1. la latence depuis N'Djamena est significative, et une requête tierce bloquante
 *     retarde le premier rendu de texte ;
 *  2. une requête sortante transmet l'adresse IP du visiteur à un tiers, ce qui est un
 *     transfert de données à déclarer au titre de la loi tchadienne n° 007/PR/2015.
 *     Servir les polices soi-même supprime le problème à la source.
 *
 * Les deux fichiers sont des polices VARIABLES : un seul fichier couvre toute la plage
 * de graisses. Inter (47 Ko) couvre 400–700, Plus Jakarta Sans (27 Ko) couvre 400–800.
 * Déclarer un fichier par graisse multiplierait le poids par quatre pour un résultat
 * visuel identique.
 *
 * `next/font/local` génère les `@font-face` au build, avec un `unicode-range` limité au
 * latin, un `font-display: swap` et une métrique de repli ajustée pour éviter que le
 * texte ne saute au chargement (CLS).
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §2.2
 */

import localFont from 'next/font/local';

/**
 * Plus Jakarta Sans — titres et libellés de bouton (`font-display`).
 * Géométrique, avec une personnalité qui porte l'image de marque.
 */
export const plusJakartaSans = localFont({
  src: './fonts/plus-jakarta-sans.woff2',
  variable: '--font-plus-jakarta',
  display: 'swap',
  weight: '400 800',
  style: 'normal',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
  preload: true,
});

/**
 * Inter — texte courant (`font-body`).
 * Optimisée pour la lisibilité des petites tailles à l'écran, y compris sur les
 * écrans d'entrée de gamme répandus sur le marché tchadien.
 */
export const inter = localFont({
  src: './fonts/inter.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '400 700',
  style: 'normal',
  fallback: ['system-ui', 'sans-serif'],
  preload: true,
});

/** Classe à appliquer sur `<html>` : déclare les deux variables CSS de police. */
export const fontVariables = `${plusJakartaSans.variable} ${inter.variable}`;
