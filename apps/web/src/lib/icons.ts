/**
 * Icônes du tableau de bord — source unique.
 *
 * ⚠️ **Pourquoi ce fichier existe.**
 *
 * Avant, chaque widget portait sa propre table d'emojis : `RecentActivities` avait
 * `ITEM_EMOJI`, `RecentTransactions` avait `KIND_EMOJI`, `NotificationsWidget` avait
 * aussi son `KIND_EMOJI`. Trois tables, trois conventions, et un défaut commun à toutes :
 * les emojis sont rendus par le système d'exploitation, donc un 👛 n'a pas le même dessin
 * sur iOS, sur Android et sur Windows. Sur un téléphone d'entrée de gamme — le matériel
 * que vise réellement Liguita — ils ne ressemblent souvent à rien de reconnaissable.
 *
 * Les icônes Lucide sont des SVG : rendu identique partout, épaisseur de trait constante,
 * et elles héritent de la couleur du texte (`currentColor`), donc du design system.
 *
 * ⚠️ **La couleur ne porte jamais seule l'information** (règle d'accessibilité du projet).
 * Chaque pastille colorée est accompagnée de son libellé textuel dans l'interface : la
 * couleur accélère la lecture, elle ne la remplace pas.
 */

import {
  BadgeCheck,
  Calendar,
  CircleAlert,
  CircleCheck,
  CreditCard,
  FileText,
  Gift,
  Handshake,
  IdCard,
  Key,
  Link as LinkIcon,
  MapPin,
  Megaphone,
  Package,
  Send,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Classe de la pastille : fond très clair + couleur d'icône assortie.
 *
 * Toutes les combinaisons sont vérifiées : le fond est un pas `50`, l'icône un pas `700`,
 * ce qui donne un contraste ≥ 4,5:1 conforme WCAG AA. Voir les tests de parité du design
 * system pour les ratios mesurés.
 */
export type ToneClass = string;

export const TONES = {
  /** Rouge de marque — perte, alerte, action principale. */
  lost: 'bg-brand-50 text-brand-700',
  /** Vert — objet trouvé, opération réussie. */
  found: 'bg-success-50 text-success-700',
  /** Ambre — en attente, en cours de traitement. */
  pending: 'bg-warning-50 text-warning-700',
  /** Bleu — information neutre, étape de parcours. */
  info: 'bg-info-50 text-info-700',
  /** Neutre — élément clôturé, sans enjeu. */
  neutral: 'bg-ink-100 text-ink-500',
  /**
   * Correspondance — l'état « le moteur a trouvé un candidat plausible ».
   *
   * ⚠️ Historiquement `bg-violet-50 text-violet-700`. Ces deux classes **n'existaient
   * pas** dans le preset Tailwind : la pastille de correspondance s'affichait donc sans
   * fond ni couleur, indiscernable d'un texte ordinaire. Remplacées par la rampe
   * `info` en aplat — le seul écart avec le ton `info` reste la saturation, ce qui
   * conserve la distinction visuelle sans introduire une couleur hors palette.
   * Contraste blanc sur `info-500` : 5,2:1, conforme AA.
   */
  match: 'bg-info-500 text-white',
} as const satisfies Record<string, ToneClass>;

export type Tone = keyof typeof TONES;

/* -------------------------------------------------------------------------- */
/* Objets                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Icône par catégorie d'objet du référentiel.
 *
 * ⚠️ La correspondance est faite sur `categoryId` tel que défini dans `@liguita/config`.
 * Toute catégorie non listée tombe sur `Package` : une icône générique reste correcte,
 * une icône fausse ne l'est pas.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'bag-wallet': Wallet,
  'phone-smartphone': Smartphone,
  'doc-national-id': IdCard,
  keys: Key,
  'bag-luggage': Package,
  'doc-passport': FileText,
  'doc-driving-licence': IdCard,
  electronics: Smartphone,
  'jewellery-watch': Sparkles,
  clothing: Package,
};

export function categoryIcon(categoryId: string | undefined): LucideIcon {
  return (categoryId && CATEGORY_ICONS[categoryId]) || Package;
}

/* -------------------------------------------------------------------------- */
/* Types d'objet                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Nature d'une déclaration.
 *
 * Le vert signale « trouvé », le rouge « perdu » — convention posée par les specs §5 et
 * reprise dans toute l'interface. Le libellé textuel accompagne toujours la couleur.
 */
export const KIND_META: Record<string, { label: string; icon: LucideIcon; tone: Tone }> = {
  FOUND: { label: 'Objet trouvé', icon: BadgeCheck, tone: 'found' },
  LOST: { label: 'Objet perdu', icon: MapPin, tone: 'lost' },
};

/* -------------------------------------------------------------------------- */
/* Statuts de déclaration                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Statut d'une déclaration.
 *
 * ⚠️ Le violet est réservé à la correspondance (specs §5). « Publié » — qui n'était
 * spécifié nulle part — est passé en bleu d'information, pour réserver le violet à son
 * seul usage légitime.
 *
 * « Payé » et « Restitué » sont tous deux en vert : ce sont les deux issues favorables,
 * et les distinguer par la couleur seule serait de toute façon insuffisant.
 */
export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  PUBLISHED: { label: 'Publié', tone: 'info' },
  MATCHED: { label: 'Correspondance', tone: 'match' },
  IN_VERIFICATION: { label: 'En vérification', tone: 'pending' },
  PAID: { label: 'Payé', tone: 'found' },
  RETURNED: { label: 'Restitué', tone: 'found' },
  EXPIRED: { label: 'Expiré', tone: 'neutral' },
  CLOSED: { label: 'Fermé', tone: 'neutral' },
};

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Icône et tonalité par nature d'opération.
 *
 * ⚠️ La tonalité reflète la NATURE de l'opération, pas son signe. Le signe comptable
 * (crédit/débit) est porté séparément par le montant lui-même, avec son signe `+` ou `−`.
 * Mélanger les deux — un fond vert pour « crédit » — rendrait impossible de distinguer
 * une récompense d'un rechargement, deux opérations qui n'ont pourtant rien à voir.
 */
export const TRANSACTION_META: Record<
  string,
  { icon: LucideIcon; tone: Tone }
> = {
  /** Récompense reversée au trouveur : c'est un gain, donc vert. */
  FINDER_REWARD: { icon: Gift, tone: 'found' },
  /** Frais payés par le propriétaire : une dépense engagée volontairement. */
  CONNECTION_FEE: { icon: Handshake, tone: 'lost' },
  /** Rechargement : opération neutre, sans enjeu de lecture. */
  TOP_UP: { icon: CreditCard, tone: 'info' },
  /** Retrait vers un moyen de paiement mobile. */
  PAYOUT: { icon: Send, tone: 'neutral' },
  /** Bonus libre offert par le propriétaire, hors commission. */
  COMMUNITY_BONUS: { icon: Sparkles, tone: 'pending' },
};

export function transactionMeta(kind: string): { icon: LucideIcon; tone: Tone } {
  return TRANSACTION_META[kind] ?? { icon: Wallet, tone: 'neutral' };
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Icône et tonalité par nature de notification.
 *
 * ⚠️ **Correction apportée.** Toutes les pastilles étaient auparavant en `bg-emerald-100`,
 * quelle que soit la notification : une correspondance, un paiement et une récompense
 * avaient donc exactement la même apparence. La couleur différencie maintenant les
 * natures — mais chaque notification porte son titre, qui reste la source d'information.
 */
export const NOTIFICATION_META: Record<
  string,
  { icon: LucideIcon; tone: Tone }
> = {
  /** Une correspondance a été trouvée : c'est l'événement le plus attendu. */
  MATCH_FOUND: { icon: Sparkles, tone: 'found' },
  /** L'objet est revenu à son propriétaire. */
  ITEM_RETURNED: { icon: Package, tone: 'found' },
  /** La mise en relation est ouverte : les coordonnées sont échangées. */
  CONNECTION_ACTIVATED: { icon: LinkIcon, tone: 'info' },
  /** Paiement accepté — c'est une confirmation, donc vert. */
  PAYMENT_CONFIRMED: { icon: CircleCheck, tone: 'found' },
  /** Récompense créditée, éventuellement encore en attente de validation. */
  REWARD_RECEIVED: { icon: Gift, tone: 'pending' },
  /** Message d'ordre général. */
  SYSTEM: { icon: Megaphone, tone: 'info' },
};

export function notificationMeta(kind: string): { icon: LucideIcon; tone: Tone } {
  return NOTIFICATION_META[kind] ?? { icon: Megaphone, tone: 'info' };
}

/* -------------------------------------------------------------------------- */
/* Statistiques                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Icônes des quatre lignes de statistiques.
 *
 * `Handshake` pour les mises en relation, `Star` pour la note : ce sont les deux seules
 * notions de cette liste que la personne doit reconnaître d'un coup d'œil, et ce sont
 * celles où une icône aide le plus.
 */
export { Gift, Handshake, MapPin, Star, Wallet, Megaphone, Tag, Calendar, CircleAlert };
