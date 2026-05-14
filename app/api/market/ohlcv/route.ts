import { NextRequest, NextResponse } from 'next/server';
import { routeOHLCV } from '@/src/lib/marketRouter';
import { supabaseAdmin, upsertOHLCV } from '@/src/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get('symbol') || 'BTCUSDT';
  const timeframe = searchParams.get('timeframe') || '15m';
  const limit     = Math.min(parseInt(searchParams.get('limit') || '500'), 1500);

  const isCrypto = /^[A-Z0-9]+(USDT|BTC|ETH|BNB)$/i.test(symbol);

  // Try Supabase cache only for crypto/memecoin assets to keep data clean
  if (isCrypto) {
    try {
      const { data: cached } = await supabaseAdmin
        .from('market_ohlcv')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('timeframe', timeframe)
        .order('open_time', { ascending: false })
        .limit(limit);

      if (cached && cached.length >= 50) {
        return NextResponse.json({
          symbol,
          timeframe,
          data: cached.reverse(),
          source: 'cache',
          count: cached.length,
        });
      }
    } catch {
      // Cache miss — continue to live fetch
    }
  }

  try {
    const data = await routeOHLCV(symbol, timeframe, limit);

    if (data && data.length > 0) {
      // Persist crypto candles to Supabase asynchronously
      if (isCrypto) {
        upsertOHLCV(data).catch(() => {});
      }
      return NextResponse.json({
        symbol,
        timeframe,
        data,
        source: 'live',
        count: data.length,
      });
    }

    return NextResponse.json({
      symbol,
      timeframe,
      data: [],
      source: 'empty',
      count: 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch market data', symbol, timeframe, data: [] },
      { status: 500 }
    );
  }
}
