/**
 * GET /api/quant/t1mo?symbol=...&tf=15m&backbone=50&magenta=10
 * Mengembalikan series T1MO + local-brain inference (offline, tanpa API external).
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv, type Timeframe } from '@/services/market/provider';
import { runIndicator } from '@/core/indicators/registry';
import { localCommentary } from '@/core/ai/local-brain';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const symbol = (u.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
    const tf = (u.searchParams.get('tf') || '15m') as Timeframe;
    const limit = Math.min(Number(u.searchParams.get('limit') ?? 300), 1000);
    const language = (u.searchParams.get('lang') as 'id' | 'en') || 'id';

    const params = {
      backbone: numOr(u.searchParams.get('backbone'), 50),
      magenta: numOr(u.searchParams.get('magenta'), 10),
      boxLookback: numOr(u.searchParams.get('boxLookback'), 20),
      boxMultiplier: numOr(u.searchParams.get('boxMultiplier'), 0.5),
      hmfPeriod: numOr(u.searchParams.get('hmfPeriod'), 10),
      strengthSlopeBars: numOr(u.searchParams.get('strengthSlopeBars'), 4),
    };

    const candles = await fetchOhlcv({ symbol, timeframe: tf, limit });

    if (!candles.length) {
      return NextResponse.json({ error: 'No market data', symbol, tf }, { status: 502 });
    }

    const ctx = {
      open: candles.map((c) => c.open),
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      volume: candles.map((c) => c.volume),
      time: candles.map((c) => c.time),
    };

    const t1mo = runIndicator('T1MO_CORE', ctx, params);
    const brain = localCommentary({
      symbol,
      timeframe: tf,
      candles: candles.map((c) => ({ ...c })),
      language,
    });

    return NextResponse.json({
      symbol,
      timeframe: tf,
      params,
      candles,
      t1mo,
      brain,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal', detail: String(e) }, { status: 500 });
  }
}

function numOr(s: string | null, def: number): number {
  if (!s) return def;
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
}
