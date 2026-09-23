import type { NextConfig } from 'next';

/**
 * Liguita — configuration Next.js.
 *
 * Référence : docs/Liguita_Plan_Implementation_v3.md §3 et §11.4
 */

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 *
 * ⚠️ Pas de `Content-Security-Policy` ici. Une CSP utile à Liguita exige un nonce par
 * requête (injecté depuis un `middleware`), sans quoi elle doit autoriser
 * `'unsafe-inline'` et ne protège plus de grand-chose. Poser dès maintenant une CSP
 * permissive donnerait une fausse assurance ; elle sera ajoutée avec le middleware
 * d'authentification (Sprint 1), en même temps que le reste de la chaîne.
 *
 * Les en-têtes ci-dessous sont, eux, sans effet de bord sur l'application.
 */
const securityHeaders = [
  /* Interdit l'inclusion du site dans une iframe : anti-clickjacking. */
  { key: 'X-Frame-Options', value: 'DENY' },
  /* Empêche le navigateur de deviner le type MIME d'une réponse. */
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  /* Ne transmet l'URL complète qu'aux origines du site, et rien du tout en HTTPS→HTTP. */
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  /* Le géocodage et la caméra servent au parcours déclaratif ; le reste est refusé. */
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), geolocation=(self), microphone=(), payment=()',
  },
  /* Un an de HSTS. Sans `preload` : l'inscription à la liste preload est irréversible. */
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /* Le dépôt est un monorepo pnpm : les paquets internes sont livrés en TypeScript brut
     (leur `main` pointe vers `src/index.ts`). Sans cette liste, Next.js tenterait de les
     lire comme du JavaScript déjà compilé et échouerait sur la première annotation de type. */
  transpilePackages: ['@liguita/ui', '@liguita/core', '@liguita/config'],

  /* Les URL se terminent sans barre oblique : une seule forme canonique par page. */
  trailingSlash: false,

  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
