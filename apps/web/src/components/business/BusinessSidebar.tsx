'use client';

import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@liguita/ui';

const ITEMS = [
  { href: '/business', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/business/objets', label: 'Inventaire', icon: Package },
  { href: '/business/matchs', label: 'Correspondances', icon: ClipboardList },
  { href: '/business/restitutions', label: 'Restitutions', icon: MessageSquare },
  { href: '/business/sites', label: 'Établissements', icon: Building2 },
  { href: '/business/equipe', label: 'Équipe', icon: Users },
  { href: '/business/statistiques', label: 'Statistiques', icon: BarChart3 },
  { href: '/business/parametres', label: 'Paramètres', icon: Settings },
];

export function BusinessSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white lg:block">
      <div className="flex h-[76px] items-center border-b border-ink-100 px-5">
        <Link href="/business" className="font-display font-extrabold text-brand-700">
          LIGUITA BUSINESS
        </Link>
      </div>
      <nav className="p-3" aria-label="Navigation Business">
        <ul className="space-y-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/business' ? pathname === '/business' : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 font-display text-sm font-bold',
                    active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50',
                  )}
                >
                  <Icon size={18} aria-hidden /> {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-ink-100 p-3">
        <Link
          href="/app"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink-600 hover:bg-ink-50"
        >
          <LogOut size={17} aria-hidden /> Espace particulier
        </Link>
      </div>
    </aside>
  );
}
