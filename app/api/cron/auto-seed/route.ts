import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Cron · /api/cron/auto-seed
 * --------------------------------------------------------------------
 * Runs hourly (cron in vercel.json). Refreshes Supabase market_ohlcv
 * for a rolling shortlist of reference symbols on 1h / 4h / 1d
 * timeframes so the database always has live data — no admin click
 * required.
 *
 * Protected by CRON_SECRET header (Vercel auto-attaches it) or the
 * x-vercel-cron header when invoked by the platform.
 */

const ALLOWED_HEADER = ['x-vercel-cron', 'x-cron-secret'];

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  for (const h of ALLOWED_HEADER) {
    if (req.headers.get(h)) return true;
  }
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  // Allow query string for manual invocation
  const url = new URL(req.url);
  if (secret && url.searchParams.get('secret') === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { seedOhlcv } = await import('@/src/services/admin/ohlcvSeeder');
    // Lean basket on cron schedule (full basket only on manual admin click)
    const symbols = [
      'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
      'ADAUSDT','DOGEUSDT','MATICUSDT','LTCUSDT','LINKUSDT',
      'AAPL','MSFT','TSLA','NVDA','SPY','QQQ',
      'EURUSD=X','^GSPC','^VIX','GC=F','CL=F',
    ];
    const result = await seedOhlcv({
      symbols,
      timeframes: ['15m','1h','4h','1d'],
      perSymbolLimit: 5000,
    });
    return NextResponse.json({
      cron: 'auto-seed',
      ranAt: new Date().toISOString(),
      ...result,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Auto-seed error' }, { status: 500 });
  }
}
