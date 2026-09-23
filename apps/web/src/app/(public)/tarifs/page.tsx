import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

import { Alert, PriceQuoteCard } from '@liguita/ui';

import { buildPricingExamples } from '../../../lib/pricing-examples';

export const metadata = {
  title: 'Tarifs',
  description: 'Frais de mise en relation Liguita et récompense du trouveur.',
};

export default function TarifsPage() {
  const examples = buildPricingExamples();
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-body-sm font-semibold text-ink-700 hover:text-ink-950"
      >
        <ArrowLeft size={16} /> Accueil
      </Link>
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-extrabold text-ink-950 sm:text-4xl">
          Frais transparents
        </h1>
        <p className="max-w-2xl text-body text-ink-600">
          Vous voyez toujours le détail avant de payer. Une partie des frais récompense la personne
          qui retrouve votre objet.
        </p>
      </header>
      <Alert tone="info" title="Livraison bientôt disponible">
        <span className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0" /> Le tarif de livraison partenaire sera
          activé après validation du contrat.
        </span>
      </Alert>
      <div className="grid gap-5 lg:grid-cols-2">
        {examples.map(({ category, quote }) => (
          <PriceQuoteCard key={category.id} quote={quote} title={category.labelFr} />
        ))}
      </div>
      <p className="text-caption text-ink-500">
        Les frais définitifs sont recalculés sur votre objet et affichés dans votre espace
        personnel.
      </p>
    </div>
  );
}
