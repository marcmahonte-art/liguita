import Link from 'next/link';

const QUICK_LINKS = [
  { href: '/app/portefeuille', emoji: '💳', label: 'Mon portefeuille' },
  { href: '/app/annonces', emoji: '📢', label: 'Mes annonces' },
  { href: '/app/paiements', emoji: '💰', label: 'Mes paiements' },
  { href: '/app/recompenses', emoji: '🎁', label: 'Mes récompenses' },
] as const;

export function DashboardQuickNav() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            id={`quick-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition hover:bg-ink-50"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
              {link.emoji}
            </span>
            <span className="text-caption font-bold text-ink-700">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
