/**
 * Cron: refresh OHLCV utama (top symbols × timeframes) ke Supabase.
 * Schedule di vercel.json: setiap 1 menit (asterisk-slash-1 syntax).
 *
 * Bearer auth via CRON_SECRET (wajib).
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv } from '@/services/market/provider';
import { supabaseAdmin } from '@/services/db/supabase';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT'];
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h'] as const;

export async function GET(req: Request) {
  const secret = req.headers.get('authorization');
  if (process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ ok: false, error: 'Supabase belum dikonfigurasi.' }, { status: 503 });

  const results: Array<{ symbol: string; tf: string; status: string; bars?: number; error?: string }> = [];
  for (const symbol of SYMBOLS) {
    for (const tf of TIMEFRAMES) {
      try {
        const bars = await fetchOhlcv({ symbol, timeframe: tf, limit: 100 });
        if (bars.length) {
          await sb.from('market_ohlcv').upsert(
            bars.map((b) => ({
              symbol, asset_class: 'crypto', exchange: 'binance', timeframe: tf,
              open_time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
              source: 'cron',
            })),
            { onConflict: 'symbol,timeframe,open_time,exchange', ignoreDuplicates: true },
          );
        }
        results.push({ symbol, tf, status: 'ok', bars: bars.length });
      } catch (e) {
        results.push({ symbol, tf, status: 'error', error: String(e) });
      }
    }
  }
  try { await sb.rpc('cleanup_old_data'); } catch { /* ignore */ }
  return NextResponse.json({ refreshed: results.length, results, ts: new Date().toISOString() });
}
