import { NextResponse, type NextRequest } from 'next/server';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';
import { runMatchSweep } from '../../../../lib/matching/run';

/**
 * Worker `match-sweep` — plan v3 §6.5, toutes les 15 minutes.
 *
 * Protégé par `CRON_SECRET` (Vercel Cron envoie `Authorization: Bearer <secret>`).
 * Tourne en **service_role** : aucun cookie de session sur une requête cron,
 * et le balayage doit lire toutes les paires lost ↔ found.
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Pas de secret configuré : on refuse en production, on autorise en dev.
    return process.env.NODE_ENV !== 'production';
  }
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = tryCreateServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 500 },
      );
    }
    const result = await runMatchSweep(supabase, 200);
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
