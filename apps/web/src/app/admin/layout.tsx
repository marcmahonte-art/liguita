'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Alert, Skeleton } from '@liguita/ui';

import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAuth } from '../../lib/auth/auth-context';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!isLoading) setReady(true); }, [isLoading]);
  const isStaff = user?.app_role === 'ADMIN' || user?.app_role === 'MODERATOR';
  if (!ready) return <div className="mx-auto max-w-5xl space-y-4 p-6"><Skeleton variant="rect" className="h-8 w-48" /><Skeleton variant="rect" className="h-96 w-full" /></div>;
  if (!user || !isStaff) return <div className="mx-auto max-w-lg p-6"><Alert tone="danger" title="Accès réservé" >Cette console est réservée aux modérateurs et administrateurs.</Alert></div>;
  return <div className="flex min-h-screen bg-surface-page"><AdminSidebar /><main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">{children}</div></main></div>;
}
