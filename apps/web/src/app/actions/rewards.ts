'use server';

export async function releaseReward(): Promise<{ ok: false; error: string }> {
  return { ok: false, error: 'Le versement de la récompense sera activé après le Sprint 6.' };
}
