/**
 * Atlas Quant · OHLCV storage abstraction
 * --------------------------------------------------------------------
 * Primary backend: Neon (serverless Postgres) — does NOT auto-pause like
 * Supabase free tier, so the OHLCV cache is durable and always writable.
 * Falls back to Supabase if no Neon connection string is present.
 *
 * Supabase is still used for auth/users/signals; only the OHLCV market
 * cache moves to Neon, which is exactly the table that was being lost
 * whenever the Supabase project paused.
 */
import { neon } from '@neondatabase/serverless';

export interface OhlcvRow {
  symbol: string;
  asset_class?: string;
  timeframe: string;
  open_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time?: number;
}

// Resolve a Neon connection string (Vercel Neon integration injects these).
// Guard: only accept a neon.tech host so we never accidentally hit the paused
// Supabase pooler that other POSTGRES_* vars might point to.
function neonConn(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.NEON_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  for (const c of candidates) {
    if (c && c.includes('neon.tech')) return c;
  }
  return null;
}

export function hasNeon(): boolean {
  return neonConn() !== null;
}

let _schemaReady = false;
async function ensureSchema(sql: ReturnType<typeof neon>): Promise<void> {
  if (_schemaReady) return;
  await sql.query(`CREATE TABLE IF NOT EXISTS market_ohlcv (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol TEXT NOT NULL, asset_class TEXT NOT NULL DEFAULT 'crypto', timeframe TEXT NOT NULL,
    open_time BIGINT NOT NULL, open NUMERIC(30,12) NOT NULL, high NUMERIC(30,12) NOT NULL,
    low NUMERIC(30,12) NOT NULL, close NUMERIC(30,12) NOT NULL, volume NUMERIC(30,8) DEFAULT 0,
    close_time BIGINT DEFAULT 0, source TEXT DEFAULT 'live', created_at TIMESTAMPTZ DEFAULT NOW())`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS market_ohlcv_stf_uidx ON market_ohlcv (symbol, timeframe, open_time)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_ohlcv_lookup ON market_ohlcv (symbol, timeframe, open_time DESC)`);
  _schemaReady = true;
}

/** Write candles to Neon (chunked bulk upsert). Returns rows written, or -1 if Neon unavailable. */
export async function writeOHLCVNeon(candles: OhlcvRow[]): Promise<number> {
  const conn = neonConn();
  if (!conn || candles.length === 0) return -1;
  const sql = neon(conn);
  await ensureSchema(sql);

  const chunk = 400;
  let written = 0;
  for (let i = 0; i < candles.length; i += chunk) {
    const slice = candles.slice(i, i + chunk);
    const vals: string[] = [];
    const params: any[] = [];
    slice.forEach((r, j) => {
      const b = j * 9;
      vals.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`);
      params.push(
        r.symbol, r.asset_class ?? 'crypto', r.timeframe, r.open_time,
        r.open, r.high, r.low, r.close, r.volume ?? 0,
      );
    });
    await sql.query(
      `INSERT INTO market_ohlcv (symbol,asset_class,timeframe,open_time,open,high,low,close,volume)
       VALUES ${vals.join(',')}
       ON CONFLICT (symbol,timeframe,open_time)
       DO UPDATE SET high=EXCLUDED.high, low=EXCLUDED.low, close=EXCLUDED.close, volume=EXCLUDED.volume`,
      params,
    );
    written += slice.length;
  }
  return written;
}

/** Read cached candles from Neon ascending by time. Returns [] if Neon unavailable. */
export async function readOHLCVNeon(symbol: string, timeframe: string, limit: number): Promise<OhlcvRow[]> {
  const conn = neonConn();
  if (!conn) return [];
  const sql = neon(conn);
  try {
    // newest `limit` rows, then return ascending
    const rows = await sql.query(
      `SELECT symbol, asset_class, timeframe, open_time, open, high, low, close, volume, close_time
       FROM market_ohlcv WHERE symbol=$1 AND timeframe=$2
       ORDER BY open_time DESC LIMIT $3`,
      [symbol.toUpperCase(), timeframe, limit],
    ) as any[];
    return rows
      .map((r) => ({
        symbol: r.symbol, asset_class: r.asset_class, timeframe: r.timeframe,
        open_time: Number(r.open_time),
        open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close),
        volume: Number(r.volume), close_time: Number(r.close_time),
      }))
      .reverse();
  } catch {
    return [];
  }
}

/** Count rows for a symbol/timeframe (diagnostics). */
export async function countOHLCVNeon(symbol: string, timeframe: string): Promise<number> {
  const conn = neonConn();
  if (!conn) return -1;
  const sql = neon(conn);
  try {
    const r = await sql.query(
      `SELECT count(*)::int n FROM market_ohlcv WHERE symbol=$1 AND timeframe=$2`,
      [symbol.toUpperCase(), timeframe],
    ) as any[];
    return r[0]?.n ?? 0;
  } catch {
    return -1;
  }
}
