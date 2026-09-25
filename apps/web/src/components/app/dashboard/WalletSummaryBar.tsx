import Link from 'next/link';
import { Wallet } from 'lucide-react';

import { formatMoney } from '@liguita/core/pricing';

/**
 * Portefeuille — résumé d'une ligne.
 *
 * ⚠️ **Uniquement le disponible.** Le solde en attente existe, il est réel, et il figure
 * déjà sur la page Portefeuille. Le répéter ici obligerait à afficher deux nombres pour
 * une seule question — « Combien ai-je gagné ? » — et l'utilisateur prendrait toujours
 * le plus grand des deux.
 *
 * Pas de graphique, pas d'historique, pas de bouton de retrait : le détail financier vit
 * dans Portefeuille et dans Transactions. Ici, on donne le chiffre et le chemin.
 */
export function WalletSummaryBar({
  available,
  pending,
  currency,
}: {
  available: number;
  pending: number;
  currency: string;
}) {
  return (
    <section
      aria-labelledby="portefeuille-titre"
      className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-700"
          aria-hidden
        >
          <Wallet size={17} />
        </span>
        <div className="min-w-0">
          <h2 id="portefeuille-titre" className="text-caption font-bold text-ink-500">
            Solde disponible
          </h2>
          <p className="font-display text-[26px] font-extrabold leading-tight tabular text-ink-950">
            {formatMoney(available, currency === 'XAF' ? 'FCFA' : currency)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {pending > 0 ? (
          /* L'en attente n'apparaît que s'il est non nul : afficher « 0 FCFA en attente »
             ajoute une information sans valeur à chaque visite. */
          <p className="text-caption text-ink-500">
            <span className="font-bold text-warning-700 tabular">
              {formatMoney(pending, currency === 'XAF' ? 'FCFA' : currency)}
            </span>{' '}
            en attente de restitution
          </p>
        ) : null}
        <Link
          href="/app/portefeuille"
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-ink-50 px-3.5 text-caption font-bold text-ink-900 transition-colors hover:bg-ink-100"
        >
          Voir mon portefeuille
        </Link>
      </div>
    </section>
  );
}
