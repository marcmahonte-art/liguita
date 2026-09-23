'use server';

export async function refundExpiredTransaction(): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'Le remboursement automatique sera activé après le Sprint 6.' };
}
