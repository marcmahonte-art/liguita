import { describe, expect, it } from 'vitest';

import {
  buildActivityFeed,
  buildDashboardKpis,
  isActiveLostItem,
  selectAttentionNotifications,
} from '../dashboard';
import type { OwnerItemListItem } from '../../app/actions/owner-items';
import type { WalletEntryItem } from '../../app/actions/wallet';
import type { NotificationListItem } from '../../app/actions/notifications';

function lostItem(overrides: Partial<OwnerItemListItem> = {}): OwnerItemListItem {
  return {
    id: 'lost-1',
    kind: 'LOST',
    title: 'iPhone 13',
    category_code: 'phone-smartphone',
    item_type_code: 'smartphone',
    description: null,
    brand: null,
    color: null,
    city_slug: 'ndjamena',
    neighborhood_slug: 'moursal',
    place_label: 'Marché de Moursal',
    event_at: '2026-09-20T10:00:00.000Z',
    status: 'PUBLISHED',
    created_at: '2026-09-20T10:00:00.000Z',
    declared_value_xaf: null,
    is_public: true,
    ...overrides,
  };
}

function entry(overrides: Partial<WalletEntryItem> = {}): WalletEntryItem {
  return {
    id: 'entry-1',
    direction: 'CREDIT',
    amount: 400,
    status: 'COMPLETED',
    sourceType: 'REWARD',
    createdAt: '2026-09-21T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildActivityFeed', () => {
  it('fusionne déclarations, correspondances et récompenses dans un seul flux trié', () => {
    const events = buildActivityFeed({
      items: [lostItem({ created_at: '2026-09-20T10:00:00.000Z' })],
      entries: [entry({ createdAt: '2026-09-21T10:00:00.000Z' })],
      matches: [
        {
          id: 'match-1',
          score: 94,
          level: 'HIGH',
          status: 'MATCHED',
          created_at: '2026-09-22T10:00:00.000Z',
          title: 'iPhone 13',
          city_slug: 'ndjamena',
          side: 'lost',
          counterpart_title: 'iPhone 13 noir',
        },
      ],
    });

    expect(events.map((event) => event.type)).toEqual([
      'CORRESPONDANCE',
      'RECOMPENSE',
      'DECLARATION',
    ]);
  });

  it('respecte la limite demandée', () => {
    const events = buildActivityFeed(
      {
        items: [lostItem({ id: 'a' }), lostItem({ id: 'b' }), lostItem({ id: 'c' })],
        entries: [],
        matches: [],
      },
      2,
    );
    expect(events).toHaveLength(2);
  });

  it('ignore les débits : une activité n\'a pas à faire apparaître un retrait', () => {
    const events = buildActivityFeed({
      items: [],
      entries: [entry({ direction: 'DEBIT', amount: -3000, sourceType: 'WITHDRAWAL' })],
      matches: [],
    });
    expect(events).toHaveLength(0);
  });

  it('marque une restitution et la rend distinguishable du statut générique', () => {
    const events = buildActivityFeed({
      items: [lostItem({ status: 'RETURNED' })],
      entries: [],
      matches: [],
    });
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.type).toBe('RESTITUTION');
    expect(event.icon).toBe('check');
    expect(event.status).toBe('Restitué');
  });

  it('traduit les statuts réels du schéma, jamais la valeur brute', () => {
    const events = buildActivityFeed({
      items: [
        lostItem({ id: 'a', status: 'DECLARED' }),
        lostItem({ id: 'b', status: 'MATCH_FOUND' }),
        lostItem({ id: 'c', kind: 'FOUND', status: 'IN_INVENTORY' }),
      ],
      entries: [],
      matches: [],
    });
    expect(events.map((event) => event.status)).toEqual([
      'Déclaré',
      'Correspondance trouvée',
      'En inventaire',
    ]);
  });

  it('masque le montant tant que la récompense n\'est pas créditée', () => {
    const events = buildActivityFeed({
      items: [],
      entries: [entry({ status: 'PENDING' })],
      matches: [],
    });
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.amountXaf).toBeUndefined();
    expect(event.status).toBe('En attente de validation');
  });
});

describe('buildDashboardKpis', () => {
  it('compte les objets par nature, statut de clôture compris', () => {
    const kpis = buildDashboardKpis({
      items: [
        lostItem({ id: 'l1' }),
        lostItem({ id: 'l2' }),
        lostItem({ id: 'l3', status: 'RETURNED' }),
        lostItem({ id: 'l4', kind: 'FOUND', status: 'FOUND' }),
        lostItem({ id: 'l5', status: 'EXPIRED' }),
      ],
      entries: [],
      matches: [],
    });

    const byId = Object.fromEntries(kpis.map((kpi) => [kpi.id, kpi.value]));
    expect(byId.lost).toBe('4');
    expect(byId.found).toBe('1');
    expect(byId.returned).toBe('1');
  });

  it('additionne uniquement les récompenses créditées', () => {
    const kpis = buildDashboardKpis({
      items: [],
      entries: [
        entry({ id: 'e1', amount: 400 }),
        entry({ id: 'e2', amount: 250 }),
        entry({ id: 'e3', amount: 900, status: 'PENDING' }),
        entry({ id: 'e4', amount: -3000, direction: 'DEBIT', sourceType: 'WITHDRAWAL' }),
      ],
      matches: [],
    });

    const rewards = kpis.find((kpi) => kpi.id === 'rewards');
    expect(rewards?.value).toBe('650');
  });

  it('expose exactement quatre indicateurs', () => {
    const kpis = buildDashboardKpis({ items: [], entries: [], matches: [] });
    expect(kpis).toHaveLength(4);
    expect(new Set(kpis.map((kpi) => kpi.id)).size).toBe(4);
  });
});

describe('selectAttentionNotifications', () => {
  const unread = (kind: string, id: string): NotificationListItem => ({
    id,
    kind,
    title: kind,
    body: null,
    read_at: null,
    created_at: '2026-09-22T10:00:00.000Z',
  });

  it('écarte les confirmations financières, qui appartiennent à Transactions', () => {
    const kept = selectAttentionNotifications([
      unread('PAYMENT_CONFIRMED', 'a'),
      unread('REWARD_RECEIVED', 'b'),
      unread('MATCH_FOUND', 'c'),
      unread('ITEM_RETURNED', 'd'),
    ]);
    expect(kept.map((item) => item.kind)).toEqual(['MATCH_FOUND', 'ITEM_RETURNED']);
  });

  it('écarte les notifications déjà lues', () => {
    const kept = selectAttentionNotifications([
      { ...unread('MATCH_FOUND', 'a'), read_at: '2026-09-22T11:00:00.000Z' },
      unread('SYSTEM', 'b'),
    ]);
    expect(kept.map((item) => item.id)).toEqual(['b']);
  });

});

describe('isActiveLostItem', () => {
  it('ne retient que les pertes qui cherchent encore', () => {
    expect(isActiveLostItem(lostItem({ status: 'DECLARED' }))).toBe(true);
    expect(isActiveLostItem(lostItem({ status: 'SEARCHING' }))).toBe(true);
    expect(isActiveLostItem(lostItem({ status: 'MATCH_FOUND' }))).toBe(true);
    expect(isActiveLostItem(lostItem({ status: 'VERIFYING' }))).toBe(true);
    expect(isActiveLostItem(lostItem({ status: 'RETURNED' }))).toBe(false);
    expect(isActiveLostItem(lostItem({ status: 'PAID' }))).toBe(false);
    expect(isActiveLostItem(lostItem({ status: 'CLOSED' }))).toBe(false);
    expect(isActiveLostItem(lostItem({ status: 'EXPIRED' }))).toBe(false);
    expect(isActiveLostItem(lostItem({ kind: 'FOUND' }))).toBe(false);
  });
});
