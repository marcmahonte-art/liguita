'use client';

import { AlertTriangle, BarChart3, Flag, Gauge, History, Package, ReceiptText, ShieldAlert, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@liguita/ui';

const ITEMS = [
  { href: '/admin', label: 'Vue d’ensemble', icon: Gauge },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/objets', label: 'Objets', icon: Package },
  { href: '/admin/matches', label: 'Correspondances', icon: ReceiptText },
  { href: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/admin/reports', label: 'Signalements', icon: Flag },
  { href: '/admin/fraud', label: 'Fraudes', icon: ShieldAlert },
  { href: '/admin/pricing', label: 'Tarification', icon: BarChart3 },
  { href: '/admin/journals', label: 'Journaux', icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white lg:block"><div className="flex h-[76px] items-center border-b border-ink-100 px-5"><Link href="/admin" className="font-display font-extrabold text-ink-950">LIGUITA ADMIN</Link></div><nav className="p-3" aria-label="Navigation administration"><ul className="space-y-1">{ITEMS.map((item) => { const Icon = item.icon; const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href); return <li key={item.href}><Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-3 rounded-lg px-3 font-display text-sm font-bold', active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50')}><Icon size={18} aria-hidden /> {item.label}</Link></li>; })}</ul></nav><div className="border-t border-ink-100 p-3"><Link href="/app" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-ink-600 hover:bg-ink-50"><AlertTriangle size={17} /> Espace particulier</Link></div></aside>;
}
