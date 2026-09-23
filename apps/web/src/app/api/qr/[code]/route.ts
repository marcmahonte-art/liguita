import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '../../../../lib/supabase/server';
import { tryCreateServiceClient } from '../../../../lib/supabase/service';

export async function GET(_request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { code } = await context.params;
  const service = tryCreateServiceClient();
  if (!service) return NextResponse.json({ error: 'Service indisponible' }, { status: 500 });
  const { data: item } = await service
    .from('found_items')
    .select('id, public_ref, title, status, organization_id, location_id')
    .eq('qr_code', code)
    .maybeSingle();
  if (!item?.organization_id) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  const { data: membership } = await service
    .from('organization_users')
    .select('location_id, accepted_at')
    .eq('organization_id', item.organization_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (
    !membership?.accepted_at ||
    (membership.location_id && membership.location_id !== item.location_id)
  )
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({
    id: item.id,
    publicRef: item.public_ref,
    title: item.title,
    status: item.status,
  });
}
