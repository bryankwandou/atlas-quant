import { NextRequest, NextResponse } from 'next/server';
import { routeOHLCV } from '@/src/lib/marketRouter';

/**
 * GET /api/market/last?symbol=BTCUSDT&timeframe=1s
 * Lightweight live-tick endpoint — returns only the last few bars (fresh, via
 * data-api.binance.vision which is reachable from Vercel). Used for TradingView-
 * style per-second updates: the chart loads full history once, then calls
 * series.update() with these bars every tick instead of refetching everything.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('timeframe') || '1s';
  try {
    const data = await routeOHLCV(symbol, timeframe, 3);
    return NextResponse.json({ symbol, timeframe, data: data.slice(-3), ts: Date.now() });
  } catch {
    return NextResponse.json({ symbol, timeframe, data: [], ts: Date.now() });
  }
}
