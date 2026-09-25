import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '../../lib/supabase/server';
import { getWallet } from '../actions/wallet';
import { listMyNotifications } from '../actions/notifications';
import { listMyOwnerItems } from '../actions/owner-items';
import { listMyMatches } from '../actions/matches';
import {
  buildActivityFeed,
  buildDashboardKpis,
  selectAttentionNotifications,
} from '../../lib/dashboard';
import { finderRewardForCategory } from '../../lib/pricing-examples';
import { DashboardHero } from '../../components/app/dashboard/DashboardHero';
import { DashboardKpis } from '../../components/app/dashboard/DashboardKpis';
import { RecentActivityFeed } from '../../components/app/dashboard/RecentActivityFeed';
import { WalletSummaryBar } from '../../components/app/dashboard/WalletSummaryBar';
import {
  ActiveAnnouncementsPanel,
  toActiveAnnouncements,
} from '../../components/app/dashboard/ActiveAnnouncementsPanel';
import { DashboardNotificationsPanel } from '../../components/app/dashboard/DashboardNotificationsPanel';

export const metadata: Metadata = { title: 'Tableau de bord' };

/**
 * Prénom affiché dans l'accueil.
 *
 * `null` — et non une chaîne de repli — quand le compte n'a renseigné ni nom ni
 * prénom : l'accueil affiche alors « Bonjour » seul, plutôt que « Bonjour, bonjour ».
 */
function firstNameOf(profile: {
  display_name: string | null;
  full_name: string | null;
} | null): string | null {
  const source = profile?.display_name ?? profile?.full_name ?? '';
  const [first] = source.trim().split(/\s+/);
  return first || null;
}

/**
 * Tableau de bord `/app` — « Que dois-je faire maintenant ? »
 *
 * Ordre de lecture, du plus général au plus urgent :
 *   1. l'accueil et les deux actions (rechercher, déclarer un objet trouvé) ;
 *   2. quatre chiffres, une seule fois, jamais répétés ailleurs ;
 *   3. ce qui demande une action (annonces actives, notifications non lues) ;
 *   4. l'historique récent, en un seul flux.
 *
 * Les données viennent de quatre appels indépendants, tous filtrés côté RLS. Chacun
 * tolère l'échec : une base vide, un portefeuille absent ou une table indisponible
 * doivent dégrader la page, jamais la casser.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/connexion?redirect=/app');

  const [profileResult, walletResult, itemsResult, matchesResult, notificationsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', user.id)
        .maybeSingle(),
      getWallet(),
      listMyOwnerItems(),
      listMyMatches(),
      listMyNotifications(),
    ]);

  const items = itemsResult.items;
  const entries = walletResult.wallet.entries;
  const matches = matchesResult.items;

  const kpis = buildDashboardKpis({ items, entries, matches });
  const events = buildActivityFeed({ items, entries, matches });
  const announcements = toActiveAnnouncements(items, finderRewardForCategory);
  const attention = selectAttentionNotifications(notificationsResult.items);

  return (
    <div className="flex flex-col gap-5">
      <DashboardHero firstName={firstNameOf(profileResult.data)} />

      <DashboardKpis kpis={kpis} />

      {/* Colonne principale (8/12) — l'historique, qui est la plus longue.
          Rail latéral (4/12) — ce qui demande une action aujourd'hui. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <RecentActivityFeed events={events} />
          <WalletSummaryBar
            available={walletResult.wallet.availableBalance}
            pending={walletResult.wallet.pendingBalance}
            currency={walletResult.wallet.currency}
          />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-4">
          <DashboardNotificationsPanel notifications={attention} />
          <ActiveAnnouncementsPanel announcements={announcements} />
        </div>
      </div>
    </div>
  );
}
