import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/services/supabase';

const WATCHLIST_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h'];

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];

  for (const symbol of WATCHLIST_SYMBOLS) {
    for (const tf of TIMEFRAMES) {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=100`
        );
        const raw = await res.json();
        const candles = raw.map((k: any[]) => ({
          symbol, asset_class: 'crypto', timeframe: tf,
          open_time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
          low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
          close_time: k[6], quote_volume: parseFloat(k[7]), trades_count: k[8],
        }));

        await supabaseAdmin.from('market_ohlcv')
          .upsert(candles, { onConflict: 'symbol,timeframe,open_time', ignoreDuplicates: true });

        results.push({ symbol, tf, count: candles.length, status: 'ok' });
      } catch (e) {
        results.push({ symbol, tf, status: 'error', error: String(e) });
      }
    }
  }

  try { await supabaseAdmin.rpc('cleanup_old_ohlcv'); } catch { /* ignore */ }

  return NextResponse.json({ refreshed: results.length, results, ts: new Date().toISOString() });
}
