import { NextResponse, type NextRequest } from 'next/server';

import { createPriceQuote } from '../../../actions/payments';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      matchId?: string;
      options?: string[];
      communityBonusXaf?: number;
      replaceQuoteId?: string;
    };
    if (!body.matchId) return NextResponse.json({ error: 'matchId manquant' }, { status: 400 });
    const result = await createPriceQuote(
      body.matchId,
      body.options ?? [],
      body.communityBonusXaf ?? 0,
      body.replaceQuoteId,
    );
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ quote: result.quote });
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
}
