import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singletons — created on first use so build-time analysis doesn't crash
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars missing');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing');
    _supabaseAdmin = createClient(url, svcKey || anonKey || '', {
      auth: { persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// Keep backward-compatible named exports (proxy getters)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabase() as any)[prop]; },
});

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabaseAdmin() as any)[prop]; },
});

export async function getOHLCV(symbol: string, timeframe: string, limit = 500) {
  const { data, error } = await getSupabaseAdmin()
    .from('market_ohlcv')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// One-time, lazy schema self-repair (no human, no secret). Only fires if a
// write hits "table missing" / "no matching constraint" — then attempts to
// create the table + 3-col unique index via the exec_sql RPC, if available.
let _schemaRepairTried = false;
const _REPAIR_SQL = [
  `CREATE TABLE IF NOT EXISTS market_ohlcv (
     id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     symbol TEXT NOT NULL, asset_class TEXT NOT NULL DEFAULT 'crypto',
     timeframe TEXT NOT NULL, open_time BIGINT NOT NULL,
     open NUMERIC(30,12) NOT NULL, high NUMERIC(30,12) NOT NULL,
     low NUMERIC(30,12) NOT NULL, close NUMERIC(30,12) NOT NULL,
     volume NUMERIC(30,8) DEFAULT 0, close_time BIGINT DEFAULT 0,
     quote_volume NUMERIC(30,8) DEFAULT 0, trades_count INTEGER DEFAULT 0,
     source TEXT DEFAULT 'live', created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS market_ohlcv_stf_uidx ON market_ohlcv (symbol, timeframe, open_time)`,
];

async function tryRepairSchema(): Promise<void> {
  if (_schemaRepairTried) return;
  _schemaRepairTried = true;
  try {
    const { executeStatements } = await import('./admin/sqlExecutor');
    await executeStatements(_REPAIR_SQL);
  } catch { /* RPC not bootstrapped — best effort only */ }
}

/**
 * Self-healing OHLCV upsert. The app's onConflict target is the 3-col tuple
 * (symbol,timeframe,open_time), but a previously-applied schema may carry a
 * 4-col unique constraint (…,exchange) — which makes the 3-col ON CONFLICT
 * throw "no unique constraint matching" and silently lose every write.
 * This walks a fallback chain so persistence works regardless of which schema
 * variant is live, WITHOUT any manual migration:
 *   1) 3-col onConflict                          (correct/migrated schema)
 *   2) 4-col onConflict incl. exchange='binance' (legacy 4-col schema)
 *   3) lazy schema repair via exec_sql, then 3-col retry
 */
export async function upsertOHLCV(candles: any[]) {
  if (candles.length === 0) return;
  const db = getSupabaseAdmin();
  const put = (rows: any[], onConflict: string) =>
    db.from('market_ohlcv').upsert(rows, { onConflict, ignoreDuplicates: true });

  // Attempt 1 — 3-col (the canonical target)
  let { error } = await put(candles, 'symbol,timeframe,open_time');
  if (!error) return;

  const msg = (error.message || '').toLowerCase();

  // Attempt 2 — legacy 4-col constraint (table has an `exchange` column)
  if (msg.includes('constraint matching') || msg.includes('on conflict')) {
    const withEx = candles.map((c) => ({ exchange: 'binance', ...c }));
    const r2 = await put(withEx, 'symbol,timeframe,open_time,exchange');
    if (!r2.error) return;
    error = r2.error;
  }

  // Attempt 3 — table missing or still no matching index: self-repair, retry
  await tryRepairSchema();
  const r3 = await put(candles, 'symbol,timeframe,open_time');
  if (!r3.error) return;

  throw r3.error;
}

export async function saveSignal(signal: any) {
  const { data, error } = await getSupabaseAdmin()
    .from('quant_signals')
    .insert(signal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLatestSignals(symbol?: string, limit = 20) {
  let query = getSupabaseAdmin()
    .from('quant_signals')
    .select('*')
    .eq('is_active', true)
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (symbol) query = query.eq('symbol', symbol);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUserSettings(userPubkey: string) {
  const { data } = await getSupabase()
    .from('user_settings')
    .select('*')
    .eq('user_pubkey', userPubkey)
    .single();
  return data;
}

export async function upsertUserSettings(settings: any) {
  const { data, error } = await getSupabase()
    .from('user_settings')
    .upsert(settings, { onConflict: 'user_pubkey' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
