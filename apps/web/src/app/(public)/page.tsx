import { ActionCardsSection } from '../../components/home/ActionCardsSection';
import { BusinessSection } from '../../components/home/BusinessSection';
import { HeroSection } from '../../components/home/HeroSection';
import { HowItWorksSection } from '../../components/home/HowItWorksSection';
import { TrustSection } from '../../components/home/TrustSection';

export const metadata = {
  title: 'Liguita — Plateforme tchadienne des objets perdus et retrouvés',
  description:
    "J'ai trouvé. Tu as perdu. On se retrouve. Moteur de recherche et plateforme sécurisée pour retrouver vos objets perdus à N'Djamena et au Tchad.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero avec recherche intelligente & visuel tchadien */}
      <HeroSection />

      {/* 2. Les deux actions principales (Perdu / Trouvé) */}
      <ActionCardsSection />

      {/* 3. Comment ça marche en 5 étapes */}
      <HowItWorksSection />

      {/* 4. Section Entreprises & Établissements */}
      <BusinessSection />

      {/* 5. Réassurance, statistiques & Ancrage tchadien */}
      <TrustSection />
    </div>
  );
}
