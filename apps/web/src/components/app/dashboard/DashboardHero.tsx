import Link from 'next/link';

import { buttonClasses } from '@liguita/ui';
import { PackagePlus, Search } from 'lucide-react';

/**
 * Zone d'accueil — « Que dois-je faire maintenant ? »
 *
 * Compacte par construction : un titre, une phrase, deux boutons. Pas d'illustration, pas
 * de chiffre, pas de raccourci supplémentaire — c'est le seul endroit du produit où l'on
 * a le droit de rappeler les deux actions fondamentales, et il ne les rappelle qu'une fois.
 *
 * ⚠️ **L'ordre de poids n'est pas négociable.** Rechercher est l'action principale : la
 * barre supérieure, la page publique et la navigation convergent toutes vers elle. Le
 * bouton « Déclarer un objet trouvé » reste donc en contour — visible, atteignable, mais
 * jamais au même niveau que la recherche.
 */
export function DashboardHero({ firstName }: { firstName: string | null }) {
  return (
    <section
      aria-labelledby="dashboard-titre"
      className="rounded-2xl border border-ink-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1
            id="dashboard-titre"
            className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-ink-950 sm:text-[32px]"
          >
            {/* Compte sans prénom renseigné : on ne devine rien et on n'affiche pas
                « Bonjour, bonjour ». L'accueil reste correct, il est simplement sans nom. */}
            {firstName ? `Bonjour, ${firstName}` : 'Bonjour'}
            <span aria-hidden> </span>
            <span className="text-brand-500" aria-hidden>
              👋
            </span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-body text-ink-600">
            Retrouvez un objet perdu ou aidez quelqu'un à retrouver le sien.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/rechercher"
            id="hero-search-btn"
            className={buttonClasses({ variant: 'primary', size: 'md', block: true })}
          >
            <Search size={18} aria-hidden />
            Rechercher un objet
          </Link>
          <Link
            href="/declarer/trouve"
            id="hero-declare-btn"
            className={buttonClasses({ variant: 'outline', size: 'md', block: true })}
          >
            <PackagePlus size={18} aria-hidden />
            Déclarer un objet trouvé
          </Link>
        </div>
      </div>
    </section>
  );
}
