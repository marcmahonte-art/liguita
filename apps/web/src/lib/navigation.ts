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
  Bell,
  Building2,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  Package,
  Search,
  Settings,
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
  { href: '/business', label: 'Entreprises', icon: Building2 },
];

/* -------------------------------------------------------------------------- */
/* Espace connecté — `/app/*`                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Entrées principales de l'espace connecté.
 *
 * ⚠️ **« Rechercher » pointe vers `/app/recherche`, pas vers `/rechercher`.** La page
 * publique `/rechercher` affiche les mêmes résultats, mais hors du coquille connecté :
 * la cliquer depuis la sidebar fait sortir de l'espace personnel, et la barre latérale
 * disparaît le temps de chercher. `/app/recherche` rend le même composant dans le
 * coquille `/app`, et c'est déjà la destination du champ de recherche de la barre
 * supérieure — l'entrée de menu et la barre convergent donc vers le même écran, ce qui
 * n'était pas le cas tant que la sidebar pointait ailleurs.
 *
 * C'est aussi la réponse à l'objection d'origine contre cet onglet : la duplication
 * avec la barre supérieure n'en est pas une puisque les deux mènent au même endroit.
 * L'onglet sert à ce que la barre ne peut pas faire — être atteint sans viser un champ
 * de 560 px de large, et signaler que la recherche est une destination à part entière.
 *
 * La navigation publique garde son propre `/rechercher` : un visiteur non connecté n'a
 * pas d'espace personnel, et lui ouvrir `/app/recherche` le renverrait vers la
 * connexion.
 *
 * Chaque entrée correspond à **un** sujet et à **une seule** page. Deux exceptions
 * historiques ont été regroupées, parce qu'un menu qui propose deux destinations pour la
 * même question oblige à choisir entre deux réponses identiques :
 *
 * - « Mon portefeuille » est libellé « Récompenses » : c'est la question que la personne
 *   se pose (« Combien ai-je gagné ? »), pas le nom de l'instrument bancaire. La page
 *   porte aussi l'historique des transactions, qui avait sa propre entrée (« Mes
 *   transactions ») et son propre menu — un deuxième écran pour exactement la même
 *   donnée. Elle y répond désormais par une redirection.
 * - Les recherches enregistrées vivaient sous deux libellés, « Mes annonces » et « Mes
 *   avis de recherche », pour une seule liste. Elles sont regroupées sous « Mes avis de
 *   recherche ». Le libellé d'origine, « Mes annonces », promettait des annonces alors
 *   qu'il s'agissait de recherches enregistrées — et le tableau de bord appelle par
 *   ailleurs « annonces » les objets perdus, ce qui rendait la distinction impossible.
 *
 * « Correspondances » figure ici parce que c'est l'écran où les deux côtés du service se
 * rejoignent : mes objets d'un côté, ceux que d'autres ont trouvés de l'autre. Elle était
 * jusqu'ici accessible seulement par les liens contextuels du tableau de bord et par le
 * menu de l'en-tête — deux chemins qui supposent de connaître son existence. Or c'est une
 * destination de travail, pas un réglage : on y va pour répondre à une question (« un
 * objet a-t-il été trouvé qui est le mien ? »), et cette question se pose tous les jours.
 * Un écran qui répond à une question courante mais n'est atteignable que par hasard
 * finit par ne pas être vu.
 *
 * Elle est placée après « Mes objets » et non à la fin : c'est l'étape suivante du même
 * parcours — je déclare, puis je regarde ce que le moteur a trouvé pour moi.
 *
 * Les routes `/app/transactions` et `/app/annonces` continuent de répondre : elles
 * redirigent vers leur page d'accueil, pour ne pas casser les liens déjà diffusés.
 */
export const APP_NAV: readonly NavItem[] = [
  { href: '/app/recherche', label: 'Rechercher', icon: Search },
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/app/objets', label: 'Mes objets', icon: Package },
  { href: '/app/correspondances', label: 'Correspondances', icon: Link2 },
  { href: '/app/portefeuille', label: 'Récompenses', icon: Wallet },
  { href: '/app/notifications', label: 'Notifications', icon: Bell },
];

/**
 * Pied de la barre latérale : aide, profil et paramètres.
 *
 * Séparés visuellement du reste. L'aide n'est pas une section du produit, c'est une
 * sortie de secours — la mêler aux entrées de travail la rendrait difficile à trouver
 * précisément au moment où on la cherche. Le profil et les paramètres, eux, sont des
 * réglages, pas des destinations de travail.
 *
 * ⚠️ « Paramètres » ne rejoue pas « Mon profil » : l'identité (prénom, nom, téléphone)
 * s'édite à un seul endroit, sur `/app/profil`. Les paramètres regroupent ce qui n'est
 * pas de l'identité — ville, langue, alertes. Deux pages qui éditent le même nom
 * seraient deux systèmes de profil, et les deux finiraient par diverger.
 */
export const APP_NAV_SECONDARY: readonly NavItem[] = [
  { href: '/help', label: 'Aide & support', icon: LifeBuoy },
  { href: '/app/profil', label: 'Mon profil', icon: User },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings },
];

/**
 * Navigation du bas (mobile) — 5 entrées, les plus utilisées.
 *
 * Reflet de `APP_NAV` et non une liste indépendante : le mobile ne doit jamais proposer
 * une navigation différente de celle du desktop, seulement une version à cinq entrées.
 * Les écrans restants (Correspondances, Messages, Aide) restent accessibles via le menu
 * de l'en-tête, qui reprend `APP_NAV`, et via les liens contextuels du tableau de bord.
 *
 * « Correspondances » n'occupe pas une des cinq places : elles sont prises, et le
 * remplacer par « Objets » ou « Alertes » coûterait un écran plus fréquent que lui. Sur
 * mobile, la barre du haut affiche déjà la même liste que la barre latérale.
 *
 * ⚠️ « Notifications » y figure pour tenir les cinq entrées. Ce n'est pas une
 * destination nouvelle : c'est la seule entrée de `APP_NAV` qui n'avait aucun équivalent
 * en bas d'écran, alors qu'une notification non lue est précisément la raison d'ouvrir
 * l'application en premier. Les recherches enregistrées, elles, n'ont pas de place ici —
 * elles se gèrent depuis les paramètres, là où l'on règle ses alertes.
 */
export const APP_BOTTOM_NAV: readonly NavItem[] = [
  { href: '/app', label: 'Accueil', icon: Home },
  { href: '/app/objets', label: 'Objets', icon: Package },
  { href: '/app/portefeuille', label: 'Récompenses', icon: Wallet },
  { href: '/app/notifications', label: 'Alertes', icon: Bell },
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
      { href: '/connexion', label: 'Connexion' },
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
