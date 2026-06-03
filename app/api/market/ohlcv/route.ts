import { NextRequest, NextResponse } from 'next/server';
import { routeOHLCV } from '@/src/lib/marketRouter';
import { supabaseAdmin, upsertOHLCV } from '@/src/services/supabase';
import { hasNeon, readOHLCVNeon, writeOHLCVNeon } from '@/src/services/ohlcvStore';

// Expected milliseconds between candles for each timeframe
const EXPECTED_INTERVAL_MS: Record<string, number> = {
  '1s': 1_000, '15s': 15_000, '30s': 30_000,
  '1m': 60_000, '3m': 180_000, '5m': 300_000,
  '10m': 600_000, '15m': 900_000, '30m': 1_800_000, '45m': 2_700_000,
  '1h': 3_600_000, '2h': 7_200_000, '3h': 10_800_000, '4h': 14_400_000,
  '6h': 21_600_000, '8h': 28_800_000, '12h': 43_200_000,
  '1d': 86_400_000, '2d': 172_800_000, '3d': 259_200_000,
  '1w': 604_800_000, '2w': 1_209_600_000,
  '1M': 2_592_000_000, '3M': 7_776_000_000,
  '6M': 15_552_000_000, '12M': 31_104_000_000,
};

/** Validate that cached candle time gaps match the expected timeframe interval (±3x tolerance) */
function isCacheValid(cached: any[], timeframe: string): boolean {
  if (cached.length < 5) return false;
  const expected = EXPECTED_INTERVAL_MS[timeframe];
  if (!expected) return true; // unknown timeframe — trust the cache

  // Sample the first 10 pairs of consecutive candles
  const sample = cached.slice(0, Math.min(11, cached.length));
  const gaps: number[] = [];
  for (let i = 1; i < sample.length; i++) {
    const gap = Math.abs(sample[i].open_time - sample[i - 1].open_time);
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length === 0) return false;

  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];

  // Accept if median gap is within [expected/3, expected*3]
  return median >= expected / 3 && median <= expected * 3;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get('symbol') || 'BTCUSDT';
  const timeframe = searchParams.get('timeframe') || '15m';
  const limit     = Math.min(parseInt(searchParams.get('limit') || '1000'), 25000);

  const isCrypto = /^[A-Z0-9]+(USDT|BTC|ETH|BNB)$/i.test(symbol);

  // Neon cache first (durable, never auto-pauses) — only for crypto/memecoin
  if (isCrypto && hasNeon()) {
    try {
      const cached = await readOHLCVNeon(symbol, timeframe, limit);
      if (cached.length >= 50 && isCacheValid(cached, timeframe)) {
        return NextResponse.json({
          symbol, timeframe, data: cached, source: 'cache', backend: 'neon', count: cached.length,
        });
      }
    } catch { /* fall through to Supabase / live */ }
  }

  // Try Supabase cache only for crypto/memecoin assets
  if (isCrypto) {
    try {
      const { data: cached } = await supabaseAdmin
        .from('market_ohlcv')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('timeframe', timeframe)
        .order('open_time', { ascending: true })
        .limit(limit);

      if (cached && cached.length >= 50) {
        if (isCacheValid(cached, timeframe)) {
          return NextResponse.json({
            symbol,
            timeframe,
            data: cached,
            source: 'cache',
            count: cached.length,
          });
        } else {
          // Cache has wrong-interval data (e.g., monthly stored as 1d) — purge it
          void (async () => {
            try {
              await supabaseAdmin
                .from('market_ohlcv')
                .delete()
                .eq('symbol', symbol.toUpperCase())
                .eq('timeframe', timeframe);
            } catch {}
          })();
        }
      }
    } catch {
      // Cache miss — continue to live fetch
    }
  }

  try {
    const data = await routeOHLCV(symbol, timeframe, limit);

    if (data && data.length > 0) {
      // Persist to the durable backend. Await so the write completes before the
      // serverless function freezes (fire-and-forget gets killed on Vercel).
      if (isCrypto) {
        if (hasNeon()) await writeOHLCVNeon(data as any).catch(() => {});
        else await upsertOHLCV(data).catch(() => {});
      }
      // Detect if we fell back to daily (market closed for intraday request)
      const isIntradayRequest = !['1d','2d','3d','1w','2w','1M','3M','6M','12M'].includes(timeframe);
      const isFallbackDaily = isIntradayRequest && data[0]?.timeframe === '1d';
      return NextResponse.json({
        symbol, timeframe, data, source: 'live', count: data.length,
        marketClosed: isFallbackDaily || false,
      });
    }

    return NextResponse.json({ symbol, timeframe, data: [], source: 'empty', count: 0 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch market data', symbol, timeframe, data: [] },
      { status: 500 }
    );
  }
}
