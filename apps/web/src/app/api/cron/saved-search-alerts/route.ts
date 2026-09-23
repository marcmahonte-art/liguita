import { NextResponse, type NextRequest } from 'next/server';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

/**
 * Worker `saved-search-alerts` — plan v3 §6.6, toutes les 30 minutes.
 * Appelle la fonction SECURITY DEFINER `run_saved_search_alerts()` en service_role.
 */
async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
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
    const { data, error } = await supabase.rpc('run_saved_search_alerts');
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, notifications: data, at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
