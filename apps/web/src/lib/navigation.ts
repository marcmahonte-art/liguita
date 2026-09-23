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
  FileText,
  HelpCircle,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
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

export const PUBLIC_NAV: readonly NavItem[] = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/rechercher', label: 'Rechercher', icon: Search },
  { href: '/objets-trouves', label: 'Objets trouvés', icon: Package },
  { href: '/about', label: 'À propos', icon: Info },
  { href: '/business', label: 'Entreprises', icon: Building2 },
  { href: '/help', label: 'Aide', icon: HelpCircle },
];

/* -------------------------------------------------------------------------- */
/* Tableau de bord — barre latérale (248 px)                                  */
/* -------------------------------------------------------------------------- */

export const DASHBOARD_NAV: readonly NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/search', label: 'Rechercher un objet', icon: Search },
  { href: '/dashboard/objects', label: 'Mes objets', icon: Package },
  { href: '/dashboard/announcements', label: 'Mes annonces', icon: FileText },
  { href: '/dashboard/wallet', label: 'Mon portefeuille', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Mes transactions', icon: ArrowLeftRight },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/profile', label: 'Mon profil', icon: User },
];

/**
 * Séparée visuellement du reste : l'aide n'est pas une section du produit, c'est une
 * sortie de secours. La mêler aux autres entrées la rendrait difficile à trouver
 * précisément au moment où on la cherche.
 */
export const DASHBOARD_SUPPORT_NAV: readonly NavItem[] = [
  { href: '/dashboard/support', label: 'Aide & support', icon: LifeBuoy },
];

/* -------------------------------------------------------------------------- */
/* Tableau de bord — navigation du bas, mobile                                */
/* -------------------------------------------------------------------------- */

/**
 * Cinq entrées au maximum : au-delà, les cibles tactiles deviennent trop étroites pour
 * un usage à une main.
 *
 * ⚠️ Le portefeuille y figure obligatoirement. C'est l'écran qui motive le plus de
 * visites récurrentes — un trouveur y vérifie l'arrivée de sa récompense — et le
 * reléguer derrière un menu l'aurait rendu invisible sur le seul appareil que la
 * majorité du public cible utilise réellement.
 */
export const DASHBOARD_BOTTOM_NAV: readonly NavItem[] = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/dashboard/search', label: 'Rechercher', icon: Search },
  { href: '/dashboard/objects', label: 'Objets', icon: Package },
  { href: '/dashboard/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/dashboard/profile', label: 'Profil', icon: User },
];

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
