import { NextResponse, type NextRequest } from 'next/server';

import { tryCreateServiceClient } from '../../../../lib/supabase/service';

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = tryCreateServiceClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  const { data: notifications, error } = await service
    .from('notifications')
    .select('id, channel, attempts')
    .is('sent_at', null)
    .is('error', null)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const notification of notifications ?? []) {
    if (notification.channel === 'WEB') {
      const { data: updated } = await service
        .from('notifications')
        .update({ sent_at: now, attempts: notification.attempts + 1 })
        .eq('id', notification.id)
        .is('sent_at', null)
        .is('error', null)
        .select('id')
        .maybeSingle();
      if (updated) sent += 1;
    } else {
      const { data: updated } = await service
        .from('notifications')
        .update({ error: 'Adaptateur de canal indisponible.', attempts: notification.attempts + 1 })
        .eq('id', notification.id)
        .is('sent_at', null)
        .is('error', null)
        .select('id')
        .maybeSingle();
      if (updated) failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: notifications?.length ?? 0,
    sent,
    failed,
    at: now,
  });
}
