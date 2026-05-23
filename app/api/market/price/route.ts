import { NextRequest, NextResponse } from 'next/server';
import { routePrice } from '@/src/lib/marketRouter';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';

  try {
    const data = await routePrice(symbol);
    if (data) return NextResponse.json(data);
    return NextResponse.json({ error: 'No price data', symbol }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Price fetch failed' }, { status: 500 });
  }
}
