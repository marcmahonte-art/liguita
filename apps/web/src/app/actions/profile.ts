'use server';

import { createClient } from '../../lib/supabase/server';

export async function updateAirtelNumber(
  airtelNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = airtelNumber.trim().replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(normalized)) {
    return { ok: false, error: 'Saisissez un numéro Airtel Money valide.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase
    .from('profiles')
    .update({ airtel_number: normalized, airtel_verified: false })
    .eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
