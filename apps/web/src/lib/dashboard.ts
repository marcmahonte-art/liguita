/**
 * Assemblage des données du tableau de bord.
 *
 * ⚠️ **Pourquoi ce fichier existe.**
 *
 * Le tableau de bord affiche des données venant de trois tables qui ne se connaissent
 * pas : `lost_items` + `found_items` (via `listMyOwnerItems`), `wallet_entries` (via
 * `getWallet`) et `matches` (via `listMyMatches`). Les fusionner dans le composant
 * rendrait la page illisible et — surtout — impossible à tester.
 *
 * Toute la logique est donc ici, sous forme de fonctions pures : le composant se contente
 * de dessiner. C'est aussi ce qui garantit qu'il n'existe qu'**une seule** source
 * d'activité à l'écran, au lieu de trois listes qui se recoupent.
 */

import type { OwnerItemListItem } from '../app/actions/owner-items';
import type { WalletEntryItem } from '../app/actions/wallet';
import type { MatchListItem } from '../app/actions/matches';
import type { NotificationListItem } from '../app/actions/notifications';
import { isActiveLostStatus, statusLabel, statusTone } from './item-status';
import type { Tone } from './icons';

/* -------------------------------------------------------------------------- */
/* Activité récente                                                            */
/* -------------------------------------------------------------------------- */

/** Clés d'icônes — résolues en SVG Lucide par le composant. Jamais d'emoji. */
export type ActivityIcon = 'search' | 'package' | 'check' | 'link' | 'gift';

export interface ActivityEvent {
  readonly id: string;
  /** Nature de l'événement — jamais affichée seule, toujours avec son libellé. */
  readonly type: 'DECLARATION' | 'CORRESPONDANCE' | 'RESTITUTION' | 'RECOMPENSE';
  readonly title: string;
  readonly status: string;
  readonly tone: Tone;
  readonly icon: ActivityIcon;
  readonly occurredAt: string;
  readonly href: string;
  /** Montant signé, uniquement pour les événements financiers. */
  readonly amountXaf?: number;
}

const OWNER_ITEM_HREF = (item: OwnerItemListItem) => `/app/objets/${item.kind.toLowerCase()}/${item.id}`;
const MATCH_HREF = (match: MatchListItem) => `/app/correspondances/${match.id}`;

/** Libellés du relevé → intitulé d'événement lisible. */
const LEDGER_LABELS: Record<string, string> = {
  REWARD: 'Récompense reçue',
  REWARD_RELEASE: 'Récompense disponible',
  WITHDRAWAL: 'Retrait Airtel Money',
};

/** Libellés du wallet → nature d'événement financier. */
function ledgerSourceType(entry: WalletEntryItem): string {
  return entry.sourceType;
}

/**
 * Construit l'UNIQUE flux d'activité du tableau de bord.
 *
 * ⚠️ Un objet et son mouvement financier ne produisent qu'**une** ligne. Un utilisateur
 * qui vient d'être reimburse ne doit pas lire deux fois la même nouvelle — une fois dans
 * « activité », une fois dans « notifications », une fois dans « transactions ».
 */
export function buildActivityFeed(
  input: {
    items: readonly OwnerItemListItem[];
    entries: readonly WalletEntryItem[];
    matches: readonly MatchListItem[];
  },
  limit = 6,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const item of input.items) {
    /* Une restitution est l'issue favorable : elle se lit comme telle, quel que soit le
       statut technique qui l'a produite (`RETURNED` côté propriétaire, `PAID` côté
       trouveur). Les deux autres statuts passent par la table partagée. */
    const isReturned = item.status === 'RETURNED' || item.status === 'PAID';
    events.push({
      id: `item-${item.id}`,
      type: isReturned ? 'RESTITUTION' : 'DECLARATION',
      title: item.title,
      status: isReturned ? 'Restitué' : statusLabel(item.status),
      tone: isReturned ? 'found' : statusTone(item.status),
      icon: isReturned ? 'check' : 'package',
      occurredAt: item.created_at,
      href: OWNER_ITEM_HREF(item),
    });
  }

  for (const match of input.matches) {
    events.push({
      id: `match-${match.id}`,
      type: 'CORRESPONDANCE',
      title: match.title,
      status: `Correspondance ${Math.round(match.score)} %`,
      tone: 'match',
      icon: 'link',
      occurredAt: match.created_at,
      href: MATCH_HREF(match),
    });
  }

  for (const entry of input.entries) {
    if (entry.direction !== 'CREDIT') continue;
    const label = LEDGER_LABELS[ledgerSourceType(entry)] ?? 'Récompense reçue';
    events.push({
      id: `entry-${entry.id}`,
      type: 'RECOMPENSE',
      title: label,
      status: entry.status === 'PENDING' ? 'En attente de validation' : 'Créditée',
      tone: entry.status === 'PENDING' ? 'pending' : 'found',
      icon: 'gift',
      occurredAt: entry.createdAt,
      href: '/app/transactions',
      amountXaf: entry.status === 'PENDING' ? undefined : entry.amount,
    });
  }

  return events
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Indicateurs                                                                 */
/* -------------------------------------------------------------------------- */

export interface DashboardKpi {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly href: string;
  readonly icon: 'search' | 'package' | 'check' | 'gift';
  readonly tone: Tone;
}

const nbsp = '\u202F';

function formatCount(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value).replace(/\u00A0|\u202F/g, nbsp);
}

/**
 * Les quatre indicateurs du tableau de bord.
 *
 * ⚠️ Règle stricte : un chiffre n'apparaît qu'ici. Le portefeuille ne montre que le
 * solde, les annonces que leur état, l'activité que les événements. Si « Récompenses
 * reçues » devait apparaître deux fois, l'une des deux serait inévitablement fausse à
 * un jour près, et l'utilisateur ne saurait plus laquelle croire.
 */
export function buildDashboardKpis(input: {
  items: readonly OwnerItemListItem[];
  entries: readonly WalletEntryItem[];
  matches: readonly MatchListItem[];
}): DashboardKpi[] {
  /* Les clôturés sont comptés : un objet rendu et clôturé reste un objet que la
     personne a déclaré. Les exclure ferait disparaître l'historique de la personne,
     et « Objets restitués » ne voudrait alors plus rien dire. */
  const lost = input.items.filter((item) => item.kind === 'LOST').length;
  const found = input.items.filter((item) => item.kind === 'FOUND').length;
  const returned = input.items.filter(
    (item) => item.status === 'RETURNED' || item.status === 'PAID',
  ).length;
  const rewarded = input.entries
    .filter((entry) => entry.direction === 'CREDIT' && entry.status === 'COMPLETED')
    .reduce((sum, entry) => sum + entry.amount, 0);

  return [
    { id: 'lost', label: 'Objets recherchés', value: formatCount(lost), href: '/app/objets', icon: 'search', tone: 'lost' },
    { id: 'found', label: 'Objets trouvés', value: formatCount(found), href: '/app/objets', icon: 'package', tone: 'found' },
    { id: 'returned', label: 'Objets restitués', value: formatCount(returned), href: '/app/objets', icon: 'check', tone: 'info' },
    {
      id: 'rewards',
      label: 'Récompenses reçues',
      value: formatCount(rewarded),
      href: '/app/portefeuille',
      icon: 'gift',
      tone: 'pending',
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Notifications requérant une attention                                        */
/* -------------------------------------------------------------------------- */

/**
 * Notifications affichables sur le tableau de bord.
 *
 * ⚠️ Deux filtres, dans cet ordre :
 *
 *  1. **Uniquement les non lues.** Une notification lue est une information déjà traitée :
 *     la garder en surface du tableau de bord la ferait s'accumuler indéfiniment, et le
 *     tableau de bord deviendrait un dossier à trier plutôt qu'un écran à regarder.
 *  2. **Jamais les Confirmation financières.** `PAYMENT_CONFIRMED` et `REWARD_RECEIVED`
 *     ne changent rien à ce que la personne doit faire aujourd'hui, et leur détail vit
 *     dans Transactions. Les afficher ici créerait une deuxième source de vérité sur
 *     l'argent — la duplication exacte que la règle du produit interdit.
 */
const FINANCIAL_NOTIFICATION_KINDS = new Set(['PAYMENT_CONFIRMED', 'REWARD_RECEIVED']);

export function selectAttentionNotifications(
  items: readonly NotificationListItem[],
  limit = 2,
): NotificationListItem[] {
  return items
    .filter((item) => item.read_at === null && !FINANCIAL_NOTIFICATION_KINDS.has(item.kind))
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Annonces actives                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Une annonce « active » est une perte qui cherche encore son propriétaire.
 *
 * Le vocabulaire vient de l'énumération `lost_status` : `DECLARED` et `SEARCHING` sont
 * les deux premiers états d'une recherche, `MATCH_FOUND` et `VERIFYING` les deux
 * suivants. Tout le reste — `PAID`, `RETURNED`, `CLOSED`, `EXPIRED` — est sorti.
 */
export function isActiveLostItem(item: OwnerItemListItem): boolean {
  return item.kind === 'LOST' && isActiveLostStatus(item.status);
}
