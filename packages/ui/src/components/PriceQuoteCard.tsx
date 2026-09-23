import type { FeeBreakdown, Payee } from '@liguita/core/pricing';

import { cn } from '../lib/cn';
import { ClassBadge } from './Badge';
import { Money } from './Money';

const PAYEE_LABELS: Record<Payee, string> = {
  LIGUITA: 'Liguita',
  FINDER: 'Trouveur',
  PARTNER: 'Partenaire livraison',
};

export interface PriceQuoteCardProps {
  quote: FeeBreakdown;
  /** Titre du devis. Par défaut : « Frais de mise en relation ». */
  title?: string;
  className?: string;
}

/**
 * Devis tarifaire affiché à l'utilisateur.
 *
 * ⚠️ Règles produit non négociables :
 *  · le détail est TOUJOURS visible avant paiement — aucun frais caché, aucune
 *    surprise au moment du règlement ;
 *  · le montant reversé au trouveur est affiché en clair : c'est ce qui motive
 *    la communauté à déclarer les objets trouvés, et donc ce qui fait fonctionner
 *    la plateforme ;
 *  · un devis est figé. Une fois émis, il ne change plus, même si la grille tarifaire
 *    évolue : d'où l'affichage de la version de grille appliquée.
 *
 * Le composant reçoit un `FeeBreakdown` déjà calculé par `@liguita/core/pricing` :
 * il ne recalcule jamais rien et n'arrondit jamais lui-même.
 */
export function PriceQuoteCard({ quote, title = 'Frais de mise en relation', className }: PriceQuoteCardProps) {
  return (
    <section
      aria-labelledby="price-quote-title"
      className={cn('rounded-xl border border-ink-200 bg-white p-5 shadow-100', className)}
    >
      <header className="flex items-start justify-between gap-3">
        <h2 id="price-quote-title" className="text-h3 text-ink-900">
          {title}
        </h2>
        <ClassBadge pricingClass={quote.pricingClass} />
      </header>

      <dl className="mt-4 flex flex-col divide-y divide-ink-100">
        {quote.lines.map((line) => (
          <div key={line.code} className="flex items-baseline justify-between gap-3 py-3">
            <dt className="min-w-0 text-body text-ink-700">
              {line.labelFr}
              <span className="ml-2 text-caption text-ink-500">{PAYEE_LABELS[line.payee]}</span>
            </dt>
            <dd className="shrink-0">
              <Money amount={line.amount} size="sm" />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex items-baseline justify-between gap-3 border-t-2 border-ink-900 pt-4">
        <span className="text-body font-bold text-ink-900">Total à payer</span>
        <Money amount={quote.totalAmount} size="lg" />
      </div>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-lg bg-ink-50 p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-caption text-ink-700">dont reversé au trouveur</dt>
          <dd>
            <Money amount={quote.rewardAmount} size="sm" />
          </dd>
        </div>

        {quote.communityBonus > 0 ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-caption text-ink-700">dont bonus communautaire</dt>
            <dd>
              <Money amount={quote.communityBonus} size="sm" />
            </dd>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-caption text-ink-700">dont commission Liguita</dt>
          <dd>
            <Money amount={quote.liguitaCommission} size="sm" />
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-caption text-ink-500">TVA incluse dans la commission</dt>
          <dd className="text-caption tabular-nums text-ink-500">{quote.vatAmount} FCFA</dd>
        </div>
      </dl>

      {quote.deliveryPayout > 0 ? (
        <p className="mt-3 text-caption text-ink-500">
          Les frais de livraison sont intégralement reversés au partenaire. Le montant affiché
          reste une estimation à confirmer avec le partenaire avant l'enlèvement.
        </p>
      ) : null}

      <p className="mt-3 text-caption text-ink-400">
        Devis figé — grille tarifaire version {quote.ruleVersion}. Ce montant ne changera plus.
      </p>
    </section>
  );
}
