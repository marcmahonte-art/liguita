import { NextResponse, type NextRequest } from 'next/server';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = tryCreateServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: 'Service indisponible' }, { status: 500 });
  const { data, error } = await service.rpc('retention_purge');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, result: data });
}
