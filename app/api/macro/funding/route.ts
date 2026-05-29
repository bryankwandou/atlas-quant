import { NextRequest, NextResponse } from 'next/server';
import { getFundingRate, getTopFundingRates } from '@/src/services/macro/funding-rates';

export const dynamic = 'force-dynamic'; // 5 min

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    if (symbol) {
      const data = await getFundingRate(symbol);
      if (!data) return NextResponse.json({ error: 'No data' }, { status: 404 });
      return NextResponse.json(data);
    }
    const data = await getTopFundingRates();
    return NextResponse.json({ rates: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch funding rates' }, { status: 500 });
  }
}
