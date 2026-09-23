import { NextResponse } from 'next/server';

import { createPublicSupabase } from '../../../lib/supabase/public';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ ok: false, service: 'configuration' }, { status: 503 });
  }
  try {
    const { error } = await createPublicSupabase().from('countries').select('code').limit(1);
    if (error) return NextResponse.json({ ok: false, service: 'supabase' }, { status: 503 });
    return NextResponse.json({ ok: true, service: 'supabase', at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, service: 'supabase' }, { status: 503 });
  }
}
