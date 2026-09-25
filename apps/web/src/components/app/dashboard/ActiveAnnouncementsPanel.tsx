import Link from 'next/link';
import { ArrowRight, Megaphone, Sparkles } from 'lucide-react';

import { buttonClasses } from '@liguita/ui';
import { formatMoney } from '@liguita/core/pricing';

import { TONES, categoryIcon } from '../../../lib/icons';
import { isActiveLostItem } from '../../../lib/dashboard';
import { statusLabel, statusTextTone, statusTone } from '../../../lib/item-status';
import type { OwnerItemListItem } from '../../../app/actions/owner-items';

export interface ActiveAnnouncement {
  readonly id: string;
  readonly title: string;
  readonly statusLabel: string;
  /** Statut brut de l'énumération — source de la couleur du libellé. */
  readonly status: string;
  readonly tone: 'lost' | 'info' | 'match' | 'pending' | 'found' | 'neutral';
  readonly placeLabel: string;
  readonly rewardXaf: number | null;
  readonly categoryCode: string;
  readonly href: string;
}

/**
 * Annonces actives — « Quelles annonces sont actuellement actives ? »
 *
 * ⚠️ Uniquement ce qui demande une action. Un objet restitué il y a trois semaines
 * n'en demande aucune : il appartient à « Mes objets », pas ici. Cette section est une
 * file d'attente, pas un historique.
 *
 * Le montant affiché est la récompense *estimée* issue de la grille tarifaire de la
 * classe de l'objet. C'est un repère, pas une promesse : le montant définitif est
 * confirmé dans la mise en relation, et c'est là qu'il est affiché comme tel.
 */
export function ActiveAnnouncementsPanel({
  announcements,
}: {
  announcements: readonly ActiveAnnouncement[];
}) {
  return (
    <section
      aria-labelledby="annonces-titre"
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xs"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 id="annonces-titre" className="font-display text-h3 font-bold text-ink-950">
          Annonces actives
        </h2>
        <Link
          href="/app/annonces"
          className="shrink-0 text-caption font-bold text-brand-600 hover:underline"
        >
          Tout voir
        </Link>
      </header>

      {announcements.length === 0 ? (
        <div className="flex flex-1 flex-col items-start gap-3 border-t border-ink-100 px-4 py-5 sm:px-5">
          <p className="text-body text-ink-500">
            Vous n&apos;avez aucune annonce active. Déclarez un objet perdu pour lancer une
            recherche.
          </p>
          <Link
            href="/declarer/perdu"
            className={buttonClasses({ variant: 'primary', size: 'sm' })}
          >
            Déclarer un objet perdu
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col border-t border-ink-100">
          {announcements.map((announcement) => {
            const Icon = categoryIcon(announcement.categoryCode);
            return (
              <li key={announcement.id} className="border-b border-ink-100 last:border-b-0">
                <Link
                  href={announcement.href}
                  className="flex min-h-[68px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50 sm:px-5"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONES[announcement.tone]}`}
                    aria-hidden
                  >
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-body font-bold text-ink-950">
                      {announcement.title}
                    </span>
                    {/* Le statut est dans le flux du texte, pas dans une pastille à
                        droite : sur un rail de 380 px, une pastille colonne le titre et
                        disparaît complètement en dessous de 640 px — c'est-à-dire
                        précisément là où l'on a le moins de place pour la-voir. */}
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption">
                      <span className={`inline-flex items-center gap-1.5 ${statusTextTone(announcement.status)}`}>
                        <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden />
                        {announcement.statusLabel}
                      </span>
                      <span className="text-ink-400" aria-hidden>
                        ·
                      </span>
                      <span className="min-w-0 truncate text-ink-500">
                        {announcement.placeLabel}
                      </span>
                      {announcement.rewardXaf !== null ? (
                        <>
                          <span className="text-ink-400" aria-hidden>
                            ·
                          </span>
                          <span className="font-bold text-ink-700">
                            {formatMoney(announcement.rewardXaf)}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </span>

                  <ArrowRight size={16} aria-hidden className="shrink-0 text-ink-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-auto flex items-center gap-2 border-t border-ink-100 px-4 py-3 text-caption text-ink-500 sm:px-5">
        <Megaphone size={14} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {announcements.length === 1
            ? '1 recherche en cours'
            : `${announcements.length} recherches en cours`}
        </span>
        <Link
          href="/declarer/trouve"
          className="inline-flex shrink-0 items-center gap-1.5 font-bold text-brand-600 hover:underline"
        >
          <Sparkles size={14} aria-hidden />
          J&apos;ai trouvé un objet
        </Link>
      </footer>
    </section>
  );
}

/** Regroupe les annonces actives à partir des objets possédés. */
export function toActiveAnnouncements(
  items: readonly OwnerItemListItem[],
  rewardForCategory: (categoryCode: string) => number | null,
): ActiveAnnouncement[] {
  return items
    .filter(isActiveLostItem)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      title: item.title,
      statusLabel: statusLabel(item.status),
      status: item.status,
      tone: statusTone(item.status),
      placeLabel: item.place_label,
      rewardXaf: rewardForCategory(item.category_code),
      categoryCode: item.category_code,
      href: `/app/objets/lost/${item.id}`,
    }));
}
