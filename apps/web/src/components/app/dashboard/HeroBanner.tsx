'use client';

import { MapPin, Search } from 'lucide-react';
import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';

import { useAuth } from '../../../lib/auth/auth-context';

function firstName(profile: {
  display_name: string | null;
  full_name: string | null;
  phone: string;
}): string {
  if (profile.display_name) return profile.display_name.split(' ')[0] ?? profile.display_name;
  if (profile.full_name) return profile.full_name.split(' ')[0] ?? profile.full_name;
  return 'toi';
}

/**
 * Hero du tableau de bord.
 *
 * ⚠️ Le bouton « Déclarer un objet trouvé » utilise le variant `success` du design
 * system, dont la couleur a été corrigée dans `packages/ui` : le texte blanc sur
 * `success.500` ne mesurait que 3,30:1, sous le seuil AA. C'est désormais `success.700`
 * (7,13:1) qui porte le libellé.
 *
 * ⚠️ L'illustration était un emoji 📍 de 72 px. Remplacée par une composition d'icônes
 * Lucide : un emoji géant agrandit un dessin prévu pour 16 px, avec un trait qui devient
 * épais et flou sur les écrans à forte densité.
 */
export function HeroBanner() {
  const { user } = useAuth();
  const name = user ? firstName(user) : '…';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-brand-50/70 p-6 shadow-xs">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-brand-100/40"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-10 right-16 size-28 rounded-full bg-brand-100/30"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Bonjour {name}
          </h1>
          <p className="mt-2 text-body text-ink-600">
            Vous pouvez à la fois rechercher un objet et signaler un objet trouvé. Chaque
            action compte&nbsp;!
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/rechercher"
              id="hero-search-btn"
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
            >
              <Search size={16} aria-hidden />
              Rechercher un objet
            </Link>
            <Link
              href="/declarer/trouve"
              id="hero-declare-btn"
              className={buttonClasses({ variant: 'success', size: 'sm' })}
            >
              + Déclarer un objet trouvé
            </Link>
          </div>
        </div>

        {/* Illustration décorative : une punaise de localisation, motif de la marque. */}
        <div
          aria-hidden
          className="hidden shrink-0 items-center justify-center sm:flex sm:size-32"
        >
          <span className="flex size-24 items-center justify-center rounded-3xl bg-white/70 shadow-xs">
            <MapPin size={52} strokeWidth={1.5} className="text-brand-500" />
          </span>
        </div>
      </div>
    </div>
  );
}
