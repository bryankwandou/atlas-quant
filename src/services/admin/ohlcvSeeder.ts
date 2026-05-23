/**
 * Atlas Quant · OHLCV bulk seeder
 * --------------------------------------------------------------------
 * Triggered from the admin console "Seed market data" button. Pulls
 * recent OHLCV for a basket of symbols / timeframes via the existing
 * multi-source aggregator (Binance / Yahoo / DexScreener) and upserts
 * into market_ohlcv. Pure bulk-data ingestion, no fabricated rows.
 */

import { supabaseAuthAdmin } from '@/src/services/supabase-auth';

const DEFAULT_SYMBOLS = [
  // Crypto majors
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','DOTUSDT','MATICUSDT','LTCUSDT','TRXUSDT','TONUSDT','NEARUSDT',
  'APTUSDT','OPUSDT','ARBUSDT','SUIUSDT','INJUSDT','SEIUSDT','TIAUSDT',
  // US mega-cap stocks
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','BRK-B','JPM','UNH','XOM','V','MA','PG','JNJ','WMT','HD',
  // ETFs
  'SPY','QQQ','IWM','DIA','GLD','SLV','TLT','HYG','XLK','XLF','XLE','XLY','XLP','XLV','XLI','XLU','XLB','XLRE',
  // Forex
  'EURUSD=X','GBPUSD=X','USDJPY=X','USDIDR=X','AUDUSD=X',
  // Commodities + indices
  'GC=F','SI=F','CL=F','NG=F','^GSPC','^IXIC','^DJI','^VIX',
];

const DEFAULT_TIMEFRAMES = ['1h','4h','1d'];

export interface SeedResult {
  attempted: number;
  inserted: number;
  failed: number;
  skipped: number;
  errors: Array<{ symbol: string; timeframe: string; error: string }>;
  perSymbol: Array<{ symbol: string; timeframe: string; inserted: number; source: string }>;
  durationMs: number;
}

function classifyAsset(sym: string): string {
  if (sym.endsWith('USDT') || sym.endsWith('USDC') || sym.endsWith('BUSD')) return 'crypto';
  if (sym.endsWith('=X')) return 'forex';
  if (sym.endsWith('=F')) return 'commodity';
  if (sym.startsWith('^')) return 'index';
  return 'stock';
}

export async function seedOhlcv(opts: { symbols?: string[]; timeframes?: string[]; perSymbolLimit?: number } = {}): Promise<SeedResult> {
  const t0 = Date.now();
  const symbols    = opts.symbols    ?? DEFAULT_SYMBOLS;
  const timeframes = opts.timeframes ?? DEFAULT_TIMEFRAMES;
  const limit      = Math.min(1000, opts.perSymbolLimit ?? 500);

  const result: SeedResult = {
    attempted: 0, inserted: 0, failed: 0, skipped: 0,
    errors: [], perSymbol: [], durationMs: 0,
  };

  const { getMultiSource } = await import('@/src/services/market/multiSource');

  for (const sym of symbols) {
    for (const tf of timeframes) {
      result.attempted++;
      try {
        const multi = await getMultiSource(sym, tf, limit);
        if (!multi.candles.length) {
          result.skipped++;
          continue;
        }
        const assetClass = classifyAsset(sym);
        const rows = multi.candles.map((c) => ({
          symbol: sym,
          asset_class: assetClass,
          timeframe: tf,
          open_time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          close_time: c.time + tfMs(tf) - 1,
          quote_volume: c.volume * c.close,
          trades_count: 0,
        }));

        // Upsert in chunks of 200 to keep payload small
        const chunk = 200;
        let ok = 0;
        for (let i = 0; i < rows.length; i += chunk) {
          const slice = rows.slice(i, i + chunk);
          const { error } = await supabaseAuthAdmin
            .from('market_ohlcv')
            .upsert(slice, { onConflict: 'symbol,timeframe,open_time', ignoreDuplicates: false });
          if (error) {
            result.errors.push({ symbol: sym, timeframe: tf, error: error.message });
            break;
          }
          ok += slice.length;
        }
        result.inserted += ok;
        result.perSymbol.push({ symbol: sym, timeframe: tf, inserted: ok, source: multi.source });
      } catch (e: any) {
        result.failed++;
        result.errors.push({ symbol: sym, timeframe: tf, error: e?.message ?? 'fetch failed' });
      }
    }
  }
  result.durationMs = Date.now() - t0;
  return result;
}

function tfMs(tf: string): number {
  if (tf.endsWith('m')) return parseInt(tf, 10) * 60_000;
  if (tf.endsWith('h')) return parseInt(tf, 10) * 3600_000;
  if (tf.endsWith('d')) return parseInt(tf, 10) * 86400_000;
  return 60_000;
}
