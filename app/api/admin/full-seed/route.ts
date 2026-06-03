import { NextRequest, NextResponse } from 'next/server';
import { getBinanceOHLCV } from '@/src/lib/marketRouter';
import { upsertOHLCV } from '@/src/services/supabase';

/**
 * POST /api/admin/full-seed?secret=<ADMIN_SECRET>
 *
 * Seeds full historical OHLCV data from 2017 → now for all major crypto pairs.
 * Uses paginated Binance fetching (5 pages × 1000 = 5000 bars per timeframe).
 *
 * For daily data (2017-now ≈ 3300 bars): single 5000-bar request covers everything.
 * For 4h data (2017-now ≈ 19,700 bars): 5000 bars = most recent ~2.3 years.
 * For 1h data: 5000 bars = most recent ~208 days.
 *
 * Klarifikasi teknis:
 * - Binance 1s API: hanya menyimpan data ~4-6 jam terakhir (bukan dari 2017).
 *   Total 1s candles dari 2017 = ~284 miliar baris — mustahil di-fetch/disimpan secara gratis.
 * - Solusi untuk 1s/5s/15s/30s: data real-time saja (tidak ada history panjang dari API publik manapun).
 * - Solusi untuk 1m: ~4.7 juta bars dari 2017 — perlu seeder background yang berjalan berulang kali.
 * - Solusi untuk 1h/4h/1d: bisa dilakukan dalam beberapa API call (5000 bars per request).
 */

const MAJOR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'LTCUSDT', 'AVAXUSDT',
  'DOTUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT',
];

const TIMEFRAMES_TO_SEED = ['1h', '4h', '1d'];
const BARS_PER_TF        = 5000; // Binance paginated up to 5×1000

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === secret) return true;
  if (req.headers.get('x-admin-secret') === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized — pass ?secret=ADMIN_SECRET' }, { status: 401 });
  }

  const results: Record<string, any> = {};
  const errors: string[] = [];
  let totalUpserted = 0;

  for (const symbol of MAJOR_SYMBOLS) {
    results[symbol] = {};
    for (const tf of TIMEFRAMES_TO_SEED) {
      try {
        const candles = await getBinanceOHLCV(symbol, tf, BARS_PER_TF);
        if (candles.length === 0) {
          results[symbol][tf] = { upserted: 0, error: 'no_data' };
          continue;
        }
        await upsertOHLCV(candles);
        results[symbol][tf] = { upserted: candles.length, oldest: new Date(candles[0].open_time).toISOString() };
        totalUpserted += candles.length;
      } catch (e: any) {
        const msg = `${symbol}/${tf}: ${e?.message ?? 'error'}`;
        errors.push(msg);
        results[symbol][tf] = { error: msg };
      }
    }
  }

  return NextResponse.json({
    seeded: true,
    totalUpserted,
    symbols: MAJOR_SYMBOLS.length,
    timeframes: TIMEFRAMES_TO_SEED,
    results,
    errors,
    note: [
      '1s/5s/15s/30s: Binance hanya simpan ~4-6 jam data terakhir — tidak ada history dari 2017.',
      '1m: ~4.7 juta bars dari 2017, perlu background seeder berulang (jalankan endpoint ini setiap jam).',
      '1h: 5000 bars = ~208 hari terakhir. Untuk 2017-now perlu ~79 halaman (jalankan cron harian).',
      '4h: 5000 bars = ~833 hari terakhir (~2.3 tahun). Untuk 2017-now perlu ~20 halaman.',
      '1d: 5000 bars = ~13.7 tahun — sudah cover 2017-now dalam 1 call.',
    ],
    timestamp: new Date().toISOString(),
  });
}

// GET for convenience (same logic)
export async function GET(req: NextRequest) {
  return POST(req);
}
