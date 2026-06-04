import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/src/core/quant/backtest-engine';
import { routeOHLCV } from '@/src/lib/marketRouter';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    symbol, timeframe,
    strategies = ['EMA_CROSS', 'BB_SQUEEZE'],
    initialCapital = 10000,
    riskPerTradePct = 1,
    commissionPct = 0.05,
    slippagePct = 0.01,
    startIndex = 50,
  } = body;

  // Fetch via the resilient router (binance.vision → CryptoCompare/OKX), NOT the
  // paused Supabase. This is the same source the live chart uses.
  const rawCandles = await routeOHLCV(symbol, timeframe, 2000).catch(() => []);

  if (!rawCandles || rawCandles.length < 100) {
    return NextResponse.json({ error: `Insufficient data for backtest — got ${rawCandles?.length ?? 0} candles for ${symbol} ${timeframe} (need 100+)` }, { status: 400 });
  }

  const candles = rawCandles.map((c: any) => ({
    time: c.open_time, open: c.open, high: c.high, low: c.low,
    close: c.close, volume: c.volume,
  }));

  const result = await runBacktest(candles, {
    symbol, timeframe, strategies,
    initialCapital, riskPerTradePct, commissionPct, slippagePct, startIndex,
  });

  return NextResponse.json(result);
}
