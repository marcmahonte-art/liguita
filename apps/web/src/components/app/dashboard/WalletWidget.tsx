'use client';

import { Eye, EyeOff, Wallet as WalletIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { Wallet } from '../../../types';

interface WalletWidgetProps {
  wallet: Wallet;
}

/**
 * ⚠️ Reproduit `formatAmount` de `@liguita/core/pricing` — espace fine insécable comme
 * séparateur de milliers. Le composant `<Money />` de `@liguita/ui` ne peut pas être
 * utilisé ici car il n'expose pas d'état « masqué ».
 *
 * TODO : factoriser dans `@liguita/ui` un `<Money />` acceptant un état masqué, afin que
 * ce formatage n'existe plus qu'à un seul endroit. Dès qu'un troisième appelant a besoin
 * de ce comportement, la duplication devient un défaut.
 */
function formatXaf(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount).replace(/\u202f|\u00a0/g, '\u00a0') + ' FCFA';
}

/**
 * Mon portefeuille.
 *
 * ⚠️ **Un solde unique serait trompeur.** Une récompense n'est acquise qu'après
 * restitution confirmée et reste en attente pendant le délai de contestation. Afficher
 * un total sans distinguer le disponible de l'attente laisserait croire à un montant
 * retirable qui ne l'est pas — c'est la première source de réclamations qu'un tel
 * service génère.
 *
 * Les deux sous-soldes sont donc toujours visibles, et chacun est libellé en clair.
 * Le masquage (`Eye` / `EyeOff`) est une commodité : à N'Djamena, on consulte souvent son
 * solde à côté de quelqu'un.
 */
export function WalletWidget({ wallet }: WalletWidgetProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-wide text-ink-500">
          <WalletIcon size={16} aria-hidden />
          Mon portefeuille
        </div>
        <button
          type="button"
          onClick={() => setHidden((value) => !value)}
          aria-label={hidden ? 'Afficher le solde' : 'Masquer le solde'}
          className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          {hidden ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>

      <p className="mt-3 font-display text-3xl font-extrabold tabular text-ink-950">
        {hidden ? '••••• FCFA' : formatXaf(wallet.totalXaf)}
      </p>

      <Link
        href="/app/transactions"
        className="mt-1 inline-block text-caption font-bold text-brand-600 hover:underline"
      >
        Voir mes transactions →
      </Link>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
            En attente
          </p>
          <p className="mt-1 font-display text-body-lg font-bold tabular text-warning-700">
            {hidden ? '•••' : formatXaf(wallet.pendingXaf)}
          </p>
          <p className="text-2xs text-ink-500">(restitution trouveur)</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
            Disponible
          </p>
          <p className="mt-1 font-display text-body-lg font-bold tabular text-success-700">
            {hidden ? '•••' : formatXaf(wallet.availableXaf)}
          </p>
        </div>
      </div>
    </div>
  );
}
