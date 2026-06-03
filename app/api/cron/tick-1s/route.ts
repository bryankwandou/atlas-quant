import { NextRequest, NextResponse } from 'next/server';
import { getBinanceOHLCV } from '@/src/lib/marketRouter';
import { upsertOHLCV } from '@/src/services/supabase';

/**
 * Vercel Cron · /api/cron/tick-1s  (Solution 2 — 1-second live buffer)
 * --------------------------------------------------------------------
 * Runs every minute (vercel.json crons). Each run pulls the most recent
 * 1-second candles for a small crypto basket and upserts them into
 * market_ohlcv (timeframe='1s'). Binance only RETAINS ~a few hours of 1s
 * history, so we cannot backfill the past — but by recording continuously
 * from now on, the database accumulates a permanent, ever-growing 1s
 * history, advancing one tick per second exactly as required.
 *
 * 1000 bars/run × every 60s comfortably covers the 60s gap with overlap,
 * so no second is lost even if a run is skipped.
 */

const BASKET = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
const ALLOWED_HEADER = ['x-vercel-cron', 'x-cron-secret'];

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  for (const h of ALLOWED_HEADER) if (req.headers.get(h)) return true;
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (secret && url.searchParams.get('secret') === secret) return true;
  if (process.env.ADMIN_SECRET && url.searchParams.get('secret') === process.env.ADMIN_SECRET) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const perSymbol: Array<{ symbol: string; fetched: number; stored: boolean; error?: string }> = [];
  let totalStored = 0;

  for (const symbol of BASKET) {
    try {
      // 1000 = Binance hard cap per call ≈ last ~16 minutes of 1s bars.
      const candles = await getBinanceOHLCV(symbol, '1s', 1000);
      if (!candles.length) {
        perSymbol.push({ symbol, fetched: 0, stored: false, error: 'no data' });
        continue;
      }
      await upsertOHLCV(candles); // throws on real DB error (no longer swallowed here)
      totalStored += candles.length;
      perSymbol.push({ symbol, fetched: candles.length, stored: true });
    } catch (e: any) {
      perSymbol.push({ symbol, fetched: 0, stored: false, error: e?.message ?? 'failed' });
    }
  }

  return NextResponse.json({
    cron: 'tick-1s',
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    totalStored,
    perSymbol,
  });
}
