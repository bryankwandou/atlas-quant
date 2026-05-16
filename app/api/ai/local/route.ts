/**
 * POST /api/ai/local
 * Local-brain inference. NO external API. Fully deterministic ensemble.
 *
 * Body:
 *   { symbol, timeframe, candles, altFactors?, language? }
 */
import { NextResponse } from 'next/server';
import { localCommentary } from '@/core/ai/local-brain';
import { fetchOhlcv, type Timeframe } from '@/services/market/provider';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let candles = body.candles as Array<{ open: number; high: number; low: number; close: number; volume: number; time: number }> | undefined;

    if (!candles?.length) {
      const symbol = String(body.symbol || 'BTCUSDT').toUpperCase();
      const tf = (body.timeframe || '15m') as Timeframe;
      candles = await fetchOhlcv({ symbol, timeframe: tf, limit: 300 });
    }

    if (!candles?.length) {
      return NextResponse.json({ error: 'No candles available' }, { status: 400 });
    }

    const result = localCommentary({
      symbol: body.symbol || 'UNKNOWN',
      timeframe: body.timeframe || '15m',
      candles,
      altFactors: body.altFactors,
      language: body.language || 'id',
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Local brain failed', detail: String(e) }, { status: 500 });
  }
}
