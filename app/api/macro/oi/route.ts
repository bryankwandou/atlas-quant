import { NextRequest, NextResponse } from 'next/server';
import { getOpenInterest } from '@/src/services/macro/open-interest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  try {
    const data = await getOpenInterest(symbol);
    if (!data) return NextResponse.json({ error: 'No OI data' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
