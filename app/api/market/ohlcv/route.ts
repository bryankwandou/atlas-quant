/**
 * OHLCV endpoint — multi-source fallback (Binance / Yahoo / DexScreener).
 * Saved cache: optional (jika Supabase ada).
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv, type Timeframe } from '@/services/market/provider';
import { supabaseAdmin } from '@/services/db/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
    const timeframe = (url.searchParams.get('tf') || '15m') as Timeframe;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 500), 2000);
    const refresh = url.searchParams.get('refresh') === 'true';
    const sb = supabaseAdmin();

    if (!refresh && sb) {
      const { data } = await sb.from('market_ohlcv')
        .select('open_time,open,high,low,close,volume')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('open_time', { ascending: false })
        .limit(limit);
      if (data && data.length >= Math.min(limit, 50)) {
        const candles = data.reverse().map((d) => ({
          time: Number(d.open_time),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume),
        }));
        return NextResponse.json({ symbol, timeframe, source: 'cache', count: candles.length, candles });
      }
    }

    const candles = await fetchOhlcv({ symbol, timeframe, limit });

    if (sb && candles.length) {
      await sb.from('market_ohlcv').upsert(
        candles.map((c) => ({
          symbol,
          asset_class: 'auto',
          timeframe,
          open_time: c.time,
          open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
          source: 'auto',
        })),
        { onConflict: 'symbol,timeframe,open_time,exchange', ignoreDuplicates: true },
      ).then(undefined, () => null);
    }

    return NextResponse.json({ symbol, timeframe, source: 'live', count: candles.length, candles });
  } catch (e) {
    return NextResponse.json({ error: 'Gagal mengambil OHLCV.', detail: String(e) }, { status: 502 });
  }
}
