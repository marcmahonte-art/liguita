'use client';

import {
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  BarChart3,
  Building2,
  Flag,
  Gauge,
  History,
  Package,
  ReceiptText,
  ShieldAlert,
  Users,
  Webhook,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@liguita/ui';

/**
 * Navigation de la console d'administration.
 *
 * ⚠️ **Regroupée par section, et c'est devenu nécessaire.** La liste plate
 * alignait douze entrées sans hiérarchie : un modérateur qui cherche « où sont
 * les retraits ? » devait lire les douze. Les sections disent d'emblée à quel
 * domaine appartient chaque écran.
 *
 * ⚠️ **Toutes les entrées pointent vers une page qui existe.** Aucune n'a été
 * retirée : l'utilisateur a demandé de tout conserver, y compris les écrans
 * arrivés en doublon lors de la fusion des deux lignes de développement. Elles
 * sont désormais regroupées visuellement, sous « anciens libellés » pour celles
 * qui font doublon — l'information reste atteignable, sans encombrer la
 * navigation principale.
 */
const SECTIONS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: typeof Gauge }>;
}> = [
  {
    label: 'Pilotage',
    items: [{ href: '/admin', label: 'Vue d’ensemble', icon: Gauge }],
  },
  {
    label: 'Finances',
    items: [
      { href: '/admin/tresorerie', label: 'Trésorerie', icon: Banknote },
      { href: '/admin/retraits', label: 'Retraits', icon: ArrowUpFromLine },
      { href: '/admin/paiements', label: 'Paiements', icon: Webhook },
      { href: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
      { href: '/admin/pricing', label: 'Tarification', icon: BarChart3 },
    ],
  },
  {
    label: 'Modération',
    items: [
      { href: '/admin/users', label: 'Utilisateurs', icon: Users },
      { href: '/admin/objets', label: 'Objets', icon: Package },
      { href: '/admin/matches', label: 'Correspondances', icon: ArrowLeftRight },
      { href: '/admin/reports', label: 'Signalements', icon: Flag },
      { href: '/admin/fraud', label: 'Fraudes', icon: ShieldAlert },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { href: '/admin/entreprises', label: 'Entreprises', icon: Building2 },
      { href: '/admin/abonnements', label: 'Abonnements', icon: ReceiptText },
      { href: '/admin/journals', label: 'Journaux', icon: History },
    ],
  },
  {
    label: 'Écrans hérités',
    items: [
      { href: '/admin/objects', label: 'Objets (en)', icon: Package },
      { href: '/admin/utilisateurs', label: 'Utilisateurs (alt.)', icon: Users },
      { href: '/admin/fraudes', label: 'Fraudes (alt.)', icon: ShieldAlert },
      { href: '/admin/tarification', label: 'Tarification (alt.)', icon: BarChart3 },
      { href: '/admin/signalements', label: 'Signalements (alt.)', icon: Flag },
      { href: '/admin/reclamations', label: 'Réclamations', icon: Flag },
      { href: '/admin/correspondances', label: 'Correspondances (alt.)', icon: ArrowLeftRight },
      { href: '/admin/parametres', label: 'Paramètres', icon: Gauge },
      { href: '/admin/reports', label: 'Rapports', icon: BarChart3 },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="flex h-[76px] shrink-0 items-center border-b border-ink-100 px-5">
          <Link href="/admin" className="font-display font-extrabold text-ink-950">
            LIGUITA ADMIN
          </Link>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto p-3"
          aria-label="Navigation administration"
        >
          {SECTIONS.map((section) => (
            <div key={section.label} className="mb-3 last:mb-0">
              <p className="px-3 pb-1.5 text-2xs font-bold uppercase tracking-wide text-ink-400">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  /* ⚠️ Correspondance exacte pour la racine, préfixe ailleurs.
                     Sans cela, `/admin` s'allumerait sur toutes les pages — un
                     `startsWith('/admin')` est vrai partout dans la console. */
                  const active =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-lg px-3 font-display text-body-sm font-bold',
                          active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50',
                        )}
                      >
                        <Icon size={17} aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-ink-100 p-3">
          <Link
            href="/app"
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-body-sm font-semibold text-ink-600 hover:bg-ink-50"
          >
            <ArrowLeftRight size={17} aria-hidden />
            Espace particulier
          </Link>
        </div>
      </div>
    </aside>
  );
}
