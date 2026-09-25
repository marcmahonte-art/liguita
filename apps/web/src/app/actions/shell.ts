'use server';

import { createClient } from '../../lib/supabase/server';

export interface ShellBadges {
  /** Notifications non lues — pastille sur la cloche de la barre supérieure. */
  unreadCount: number;
  /**
   * Solde disponible du portefeuille, pour le raccourci de la barre supérieure.
   *
   * `null` signifie « indisponible » et non « zéro » : un compte sans portefeuille
   * n'affichera pas de lien, alors qu'un solde réellement nul doit rester visible pour
   * que la personne comprenne qu'elle n'a rien encore perçu.
   */
  availableBalance: number | null;
}

/**
 * Données de la coquille partagée par toutes les pages `/app/*`.
 *
 * ⚠️ Volontairement minimal : la pastille de notifications et le solde disponible sont
 * les deux seules informations que la barre supérieure affiche. Tout le reste vit dans
 * les pages concernées — c'est ce qui évite d'avoir un « header » qui devient un second
 * tableau de bord.
 *
 * Les deux lectures sont indépendantes et tolèrent l'échec : une erreur réseau sur
 * l'une ne doit pas vider l'autre, ni faire tomber la page.
 */
export async function getShellBadges(): Promise<ShellBadges> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { unreadCount: 0, availableBalance: null };

  const [unreadResult, accountResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'WEB')
      .is('read_at', null),
    supabase
      .from('wallet_accounts')
      .select('available_balance')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return {
    unreadCount: unreadResult.error ? 0 : (unreadResult.count ?? 0),
    availableBalance:
      accountResult.error || accountResult.data === null
        ? null
        : Number(accountResult.data.available_balance ?? 0),
  };
}
