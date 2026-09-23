'use client';

import { ReceiptText } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { Alert, Badge, Card, Input, Skeleton } from '@liguita/ui';

import { createAdminRefund, listAdminTransactions } from '../../actions/admin';
import { useAuth } from '../../../lib/auth/auth-context';

export default function AdminTransactionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; publicRef: string; amount: number; status: string; provider: string; payerId: string; createdAt: string; refundAmount: number }>>([]);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  useEffect(() => { if (!authLoading && user) listAdminTransactions().then((result) => { setItems(result.items); setError(result.error ?? null); }); }, [authLoading, user]);
  function refund() { if (!selected || !amount || !reason.trim()) return; startTransition(async () => { const result = await createAdminRefund(selected, Number(amount), reason); if (result.error) setError(result.error); else { setMessage('Remboursement enregistré.'); setAmount(''); setReason(''); const refresh = await listAdminTransactions(); setItems(refresh.items); } }); }
  if (authLoading) return <Skeleton variant="rect" className="h-96 w-full" />;
  return <div className="space-y-6"><div><h1 className="font-display text-2xl font-extrabold text-ink-950">Transactions</h1><p className="mt-1 text-body text-ink-600">Rapprochement et remboursements avec écritures compensatoires.</p></div>{error ? <Alert tone="danger" title={error} /> : null}{message ? <Alert tone="success" title={message} /> : null}<Card><h2 className="flex items-center gap-2 font-display font-bold"><ReceiptText size={17} /> Remboursement manuel</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="flex flex-col gap-2"><span className="text-caption font-bold text-ink-700">Transaction</span><select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-[52px] rounded-lg border border-ink-400 px-3"><option value="">Choisir</option>{items.map((item) => <option key={item.id} value={item.id}>{item.publicRef} · {item.amount} FCFA</option>)}</select></label><Input label="Montant" type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} /><Input label="Motif" value={reason} onChange={(event) => setReason(event.target.value)} /></div><button type="button" disabled={isPending || !selected || !amount || !reason.trim()} onClick={refund} className="mt-4 rounded-lg bg-brand-700 px-4 py-3 font-display text-sm font-bold text-white disabled:opacity-50">Créer le remboursement</button></Card><div className="space-y-3">{items.map((item) => <Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display font-bold text-ink-950">{item.publicRef}</p><p className="text-caption text-ink-500">{item.provider} · {item.createdAt.slice(0, 10)}</p></div><div className="text-right"><p className="font-display font-bold text-ink-950">{item.amount} FCFA</p><Badge tone={item.status === 'PAID' ? 'found' : 'neutral'}>{item.status}</Badge></div></div></Card>)}</div></div>;
}
