import { NextRequest, NextResponse } from 'next/server';
import { getMultiSource } from '@/src/services/market/multiSource';

/**
 * GET /api/market/multi?symbol=BTCUSDT&interval=1h&limit=200
 *
 * Tries multiple open-source providers (Binance → KuCoin → Kraken → CoinPaprika
 * for crypto; DexScreener + GeckoTerminal for DEX; Yahoo for everything else)
 * and returns the first response with full OHLCV + volume + liquidity.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').trim();
  const interval = searchParams.get('interval') || '1h';
  const limit = Math.max(10, Math.min(1000, parseInt(searchParams.get('limit') || '200', 10)));

  const data = await getMultiSource(symbol, interval, limit);
  if (!data.candles.length && !data.ticker) {
    return NextResponse.json({ error: 'No provider returned data for this symbol/interval.', symbol, interval, providers_tried: data.notes }, { status: 503 });
  }
  return NextResponse.json({
    symbol,
    interval,
    source: data.source,
    candles: data.candles,
    ticker: data.ticker,
    notes: data.notes,
    timestamp: Date.now(),
  });
}
