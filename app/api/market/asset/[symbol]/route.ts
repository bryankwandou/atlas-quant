import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/utils/auth-middleware';
import { signalCache } from '@/core/cache/runtime';

export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const userKey = verifySessionToken(request);
  if (!userKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get('interval') || '1h';

  const cacheKey = `signal:${symbol}:${interval}`;
  const candleKey = `candles:${symbol}:${interval}`;

  let signal = signalCache.get(cacheKey);
  let candles = signalCache.get(candleKey);

  if (!signal || !candles || candles.length === 0) {
    try {
      const { routeOHLCV } = await import('@/src/lib/marketRouter');
      const { analyzeMarket } = await import('@/core/quant');
      const { getUnixTimestamp } = await import('@/utils/time');

      const rawCandles = await routeOHLCV(symbol, interval, 200);

      if (rawCandles && rawCandles.length > 0) {
        candles = rawCandles.map((c: any) => ({
          time: c.time ?? Math.floor((c.open_time ?? 0) / 1000),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume ?? 0),
        }));

        const quantOutput = analyzeMarket({ symbol, candles });
        signal = {
          symbol,
          price: candles[candles.length - 1].close,
          quant: quantOutput,
          timestamp: getUnixTimestamp(),
          source: 'live',
        };
        signalCache.set(cacheKey, signal, 5 * 60 * 1000);
        signalCache.set(candleKey, candles, 5 * 60 * 1000);
      }
    } catch (e) {
      console.error('[asset:upstream]', e);
    }
  }

  // No dummy fallback — return a 503 so the UI can show a real error state.
  if (!signal || !candles || candles.length === 0) {
    return NextResponse.json(
      {
        error: 'Upstream data providers unavailable for this symbol/interval.',
        symbol,
        interval,
        providers_tried: ['Binance', 'Yahoo Finance', 'CoinGecko'],
      },
      { status: 503 },
    );
  }

  const { computePerformanceGrid } = await import('@/core/quant/performance');
  const performance = computePerformanceGrid(candles);

  return NextResponse.json({
    signal,
    candles,
    performance,
    version: '2.1.0',
    engine: 'ATLAS_RENAISSANCE_V1',
  });
}
