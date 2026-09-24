import { CreditCard, Gift, Megaphone, Wallet } from 'lucide-react';
import Link from 'next/link';

import { TONES, type Tone } from '../../../lib/icons';

const QUICK_LINKS: readonly {
  href: string;
  label: string;
  Icon: typeof Wallet;
  tone: Tone;
}[] = [
  { href: '/app/portefeuille', label: 'Mon portefeuille', Icon: Wallet, tone: 'info' },
  { href: '/app/annonces', label: 'Mes annonces', Icon: Megaphone, tone: 'pending' },
  { href: '/app/paiements', label: 'Mes paiements', Icon: CreditCard, tone: 'neutral' },
  { href: '/app/recompenses', label: 'Mes récompenses', Icon: Gift, tone: 'found' },
];

/**
 * Navigation rapide.
 *
 * Les icônes sont décoratives : le libellé textuel porte seul le sens, et chaque lien
 * reste donc parfaitement compréhensible sans voir la couleur ni le pictogramme.
 */
export function DashboardQuickNav() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.Icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              id={`quick-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition hover:bg-ink-50"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-xl ${TONES[link.tone]}`}
                aria-hidden
              >
                <Icon size={22} />
              </span>
              <span className="text-caption font-bold text-ink-700">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
