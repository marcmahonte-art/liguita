/**
 * Configuration de la navigation.
 *
 * Une seule source pour les trois surfaces : la barre latérale du tableau de bord,
 * la navigation du bas sur mobile, et l'en-tête public. Dupliquer ces listes serait la
 * garantie qu'un lien ajouté d'un côté manque de l'autre — le défaut classique des
 * interfaces qui divergent entre desktop et mobile.
 *
 * Les icônes Lucide sont des composants SVG sans état, utilisables au rendu serveur.
 */

import {
  ArrowLeftRight,
  Bell,
  Building2,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Description courte, affichée en info-bulle ou sous le libellé. */
  readonly description?: string;
}

/* -------------------------------------------------------------------------- */
/* En-tête public                                                             */
/* -------------------------------------------------------------------------- */

/**
 * En-tête public — volontairement court.
 *
 * ⚠️ Quatre entrées ont été retirées : « Objets trouvés », « Tarifs », « À propos » et
 * « Aide ». Un menu public de huit entrées sur un écran large n'est pas un menu, c'est
 * une table des matières — et chaque entrée supplémentaire réduit la part d'attention
 * Revenue à celles qui restent. Les pages correspondantes restent accessibles par leur
 * URL et par les liens contextuels (détail d'un objet, pied de page) : retirer un lien
 * n'est pas retirer une page.
 *
 * On garde « Objets perdus » et non « Objets trouvés » : la perte est le point de
 * départ du service, le trouvaille en est la conséquence.
 */
export const PUBLIC_NAV: readonly NavItem[] = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/rechercher', label: 'Rechercher', icon: Search },
  { href: '/objets-perdus', label: 'Objets perdus', icon: Package },
  { href: '/business', label: 'Entreprises', icon: Building2 },
];

/* -------------------------------------------------------------------------- */
/* Espace connecté — `/app/*`                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Entrées principales de l'espace connecté.
 *
 * ⚠️ **« Rechercher un objet » n'y figure pas volontairement.** La recherche est
 * l'action n°1 du produit : elle occupe la barre supérieure en permanence et le bouton
 * principal du tableau de bord. Une entrée de menu supplémentaire serait une troisième
 * copie du même lien — et un menu qui répète ce que l'écran d'accueil affiche déjà en
 * plus grand n'aide personne à décider.
 *
 * De même, « Mon portefeuille » est libellé « Récompenses » : c'est la question que la
 * personne se pose (« Combien ai-je gagné ? »), pas le nom de l'instrument bancaire.
 */
export const APP_NAV: readonly NavItem[] = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/app/objets', label: 'Mes objets', icon: Package },
  { href: '/app/annonces', label: 'Mes annonces', icon: Megaphone },
  { href: '/app/portefeuille', label: 'Récompenses', icon: Wallet },
  { href: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/app/notifications', label: 'Notifications', icon: Bell },
];

/**
 * Pied de la barre latérale : aide et profil.
 *
 * Séparés visuellement du reste. L'aide n'est pas une section du produit, c'est une
 * sortie de secours — la mêler aux entrées de travail la rendrait difficile à trouver
 * précisément au moment où on la cherche. Le profil, lui, est un réglage, pas une
 * destination de travail.
 */
export const APP_NAV_SECONDARY: readonly NavItem[] = [
  { href: '/help', label: 'Aide & support', icon: LifeBuoy },
  { href: '/app/profil', label: 'Mon profil', icon: User },
];

/**
 * Navigation du bas (mobile) — 5 entrées, les plus utilisées.
 *
 * Reflet de `APP_NAV` et non une liste indépendante : le mobile ne doit jamais proposer
 * une navigation différente de celle du desktop, seulement une version à cinq entrées.
 * Les écrans restants (Correspondances, Messages, Aide) restent accessibles via le menu
 * de l'en-tête et via les liens contextuels du tableau de bord.
 */
export const APP_BOTTOM_NAV: readonly NavItem[] = [
  { href: '/app', label: 'Accueil', icon: Home },
  { href: '/app/objets', label: 'Objets', icon: Package },
  { href: '/app/annonces', label: 'Annonces', icon: Megaphone },
  { href: '/app/portefeuille', label: 'Récompenses', icon: Wallet },
  { href: '/app/profil', label: 'Profil', icon: User },
];

/**
 * Une entrée est active si elle est la route courante, ou un préfixe de celle-ci.
 *
 * `/app` est traitée à part : sans cette exception, elle serait « active » partout, y
 * compris sur `/app/objets`. Le reste du code compare les chaînes à la main, et c'est
 * précisément là que naissent les surbrillances doubles.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* -------------------------------------------------------------------------- */
/* Pied de page public                                                        */
/* -------------------------------------------------------------------------- */

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly { readonly href: string; readonly label: string }[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Le service',
    links: [
      { href: '/rechercher', label: 'Rechercher un objet' },
      { href: '/objets-trouves', label: 'Objets trouvés' },
      { href: '/objets-perdus', label: 'Objets perdus' },
      { href: '/declarer/perdu', label: 'Déclarer une perte' },
      { href: '/declarer/trouve', label: 'Déclarer un objet trouvé' },
      { href: '/business', label: 'Liguita Business' },
    ],
  },
  {
    title: 'Liguita',
    links: [
      { href: '/about', label: 'À propos' },
      { href: '/help', label: 'Aide & support' },
      { href: '/legal/cgu', label: 'Conditions générales' },
      { href: '/legal/confidentialite', label: 'Confidentialité' },
    ],
  },
];

/**
 * Cibles visées par Liguita Business.
 *
 * Un objet perdu ne se perd pas n'importe où : il se perd là où l'on passe en transportant
 * quelque chose. Ces six lieux concentrent l'essentiel des déclarations, et ce sont eux
 * qu'un guichet d'objets trouvés organisé soulage réellement.
 */
export const BUSINESS_TARGETS = [
  { label: 'Aéroports', icon: Building2 },
  { label: 'Gares routières', icon: Package },
  { label: 'Hôtels', icon: Building2 },
  { label: 'Supermarchés', icon: Package },
  { label: 'Universités', icon: Building2 },
  { label: 'Centres commerciaux', icon: Building2 },
] as const;
