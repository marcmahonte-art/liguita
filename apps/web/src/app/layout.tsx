import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@liguita/ui/globals.css';

import { AuthProvider } from '../lib/auth/auth-context';
import { fontVariables } from '../fonts';

/**
 * Métadonnées par défaut.
 *
 * ⚠️ `robots: noindex` est volontaire et temporaire. Tant que le site n'a ni contenu
 * réel, ni CGU, ni politique de confidentialité publiées, l'indexer reviendrait à
 * exposer des pages vides et à brûler le référencement de la marque. À retirer au
 * moment de l'ouverture publique.
 */
export const metadata: Metadata = {
  title: {
    default: 'Liguita — objets perdus et retrouvés au Tchad',
    template: '%s · Liguita',
  },
  description:
    "Liguita met en relation les personnes qui ont perdu un objet et celles qui l'ont trouvé, à N'Djamena et dans les principales villes du Tchad.",
  applicationName: 'Liguita',
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /* La couleur de marque teinte la barre du navigateur sur Android. */
  themeColor: '#E50F1A',
  /* Le zoom reste autorisé : le bloquer serait une faute d'accessibilité. */
  maximumScale: 5,
};

/**
 * Layout racine — coquille HTML uniquement.
 *
 * ⚠️ Ce fichier ne contient **ni en-tête, ni pied de page**. La raison est structurelle :
 * le site public et le tableau de bord n'ont pas la même coquille — l'un a un en-tête
 * marketing, l'autre une barre latérale et une navigation basse. Placer une coquille
 * ici obligerait le tableau de bord à la masquer, ce qui produit un flash visible au
 * chargement.
 *
 * Chaque groupe de routes porte donc sa propre coquille :
 *   · `(public)/layout.tsx`    → en-tête + pied de page
 *   · `(dashboard)/layout.tsx` → barre latérale + barre supérieure + navigation basse
 *
 * Les parenthèses du nom des dossiers indiquent un groupe de routes : il n'apparaît
 * jamais dans l'URL. `/` reste `/`, et `/dashboard` reste `/dashboard`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-screen bg-surface-page font-body text-ink-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
