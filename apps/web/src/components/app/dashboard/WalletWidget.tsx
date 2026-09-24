'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { Wallet } from '../../../types';

interface WalletWidgetProps {
  wallet: Wallet;
}

function formatXaf(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export function WalletWidget({ wallet }: WalletWidgetProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-caption font-bold text-ink-500 uppercase tracking-wide">
          <span>💳</span>
          Mon portefeuille
        </div>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? 'Afficher le solde' : 'Masquer le solde'}
          className="text-ink-400 hover:text-ink-700 transition-colors"
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <p className="mt-3 font-display text-3xl font-extrabold text-ink-950">
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
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
            En attente
          </p>
          <p className="mt-1 font-display text-body-lg font-bold text-amber-600">
            {hidden ? '•••' : formatXaf(wallet.pendingXaf)}
          </p>
          <p className="text-2xs text-ink-400">(restitution trouveur)</p>
        </div>
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-400">
            Disponible
          </p>
          <p className="mt-1 font-display text-body-lg font-bold text-emerald-600">
            {hidden ? '•••' : formatXaf(wallet.availableXaf)}
          </p>
        </div>
      </div>
    </div>
  );
}
