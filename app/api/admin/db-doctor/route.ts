import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/services/supabase';
import { executeStatements, BOOTSTRAP_SQL } from '@/src/services/admin/sqlExecutor';

/**
 * GET /api/admin/db-doctor?secret=ADMIN_SECRET
 *
 * Court-grade proof + self-heal for the market_ohlcv persistence layer.
 *
 * Why this exists: every OHLCV upsert in the app used
 * `onConflict: 'symbol,timeframe,open_time'`, but the originally-shipped
 * schema.sql declared a 4-column unique constraint
 * `(symbol,timeframe,open_time,exchange)`. Postgres requires the ON CONFLICT
 * target to EXACTLY match a unique index/constraint, so every write threw
 * "no unique or exclusion constraint matching" — and the caller swallowed it
 * with `.catch(() => {})`. Result: the cache never filled, every request hit
 * `source:'live'`, and nothing was ever persisted.
 *
 * This endpoint:
 *   1. Reports env wiring.
 *   2. Runs a REAL write+read roundtrip and surfaces the un-swallowed error.
 *   3. If the write fails, self-heals via the exec_sql RPC (creates the table
 *      and a 3-column UNIQUE INDEX that the onConflict target needs).
 *   4. Retries the roundtrip and returns a verdict.
 *   5. If the RPC is not bootstrapped, returns copy-paste-ready SQL.
 */

// Minimal table + the 3-column unique index the app's onConflict needs.
const REPAIR_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS market_ohlcv (
     id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     symbol        TEXT NOT NULL,
     asset_class   TEXT NOT NULL DEFAULT 'crypto',
     timeframe     TEXT NOT NULL,
     open_time     BIGINT NOT NULL,
     open          NUMERIC(30,12) NOT NULL,
     high          NUMERIC(30,12) NOT NULL,
     low           NUMERIC(30,12) NOT NULL,
     close         NUMERIC(30,12) NOT NULL,
     volume        NUMERIC(30,8) DEFAULT 0,
     close_time    BIGINT DEFAULT 0,
     quote_volume  NUMERIC(30,8) DEFAULT 0,
     trades_count  INTEGER DEFAULT 0,
     source        TEXT DEFAULT 'live',
     created_at    TIMESTAMPTZ DEFAULT NOW()
   )`,
  // The critical line: a 3-col unique index that ON CONFLICT (symbol,timeframe,open_time) can match.
  `CREATE UNIQUE INDEX IF NOT EXISTS market_ohlcv_stf_uidx ON market_ohlcv (symbol, timeframe, open_time)`,
  `CREATE INDEX IF NOT EXISTS idx_ohlcv_lookup ON market_ohlcv (symbol, timeframe, open_time DESC)`,
];

const PASTE_SQL = [BOOTSTRAP_SQL, '', ...REPAIR_STATEMENTS.map((s) => s.trim() + ';')].join('\n\n');

async function writeReadRoundtrip(): Promise<{ ok: boolean; error?: string; readBack: number }> {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const testRow = {
    symbol: '__DBTEST__',
    asset_class: 'diagnostic',
    timeframe: '1s',
    open_time: now,
    open: 1, high: 1, low: 1, close: 1,
    volume: 0, close_time: now + 999, quote_volume: 0, trades_count: 0,
    source: 'db-doctor',
  };

  // Upsert twice to exercise the ON CONFLICT path (the part that was failing).
  const { error: e1 } = await db
    .from('market_ohlcv')
    .upsert([testRow], { onConflict: 'symbol,timeframe,open_time', ignoreDuplicates: true });
  if (e1) return { ok: false, error: e1.message, readBack: 0 };

  const { error: e2 } = await db
    .from('market_ohlcv')
    .upsert([testRow], { onConflict: 'symbol,timeframe,open_time', ignoreDuplicates: true });
  if (e2) return { ok: false, error: e2.message, readBack: 0 };

  const { count, error: e3 } = await db
    .from('market_ohlcv')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', '__DBTEST__');
  if (e3) return { ok: false, error: e3.message, readBack: 0 };

  return { ok: true, readBack: count ?? 0 };
}

async function realCounts(): Promise<Record<string, number>> {
  const db = getSupabaseAdmin();
  const out: Record<string, number> = {};
  for (const [sym, tf] of [['BTCUSDT', '1d'], ['BTCUSDT', '1h'], ['ETHUSDT', '1d'], ['BTCUSDT', '1s']] as const) {
    try {
      const { count } = await db
        .from('market_ohlcv')
        .select('*', { count: 'exact', head: true })
        .eq('symbol', sym)
        .eq('timeframe', tf);
      out[`${sym}/${tf}`] = count ?? 0;
    } catch {
      out[`${sym}/${tf}`] = -1;
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  // Step 1 — diagnose current state (un-swallowed)
  const before = await writeReadRoundtrip();

  if (before.ok) {
    return NextResponse.json({
      verdict: 'HEALTHY',
      message: 'market_ohlcv accepts upserts and reads back. Persistence works.',
      env,
      writeTest: before,
      storedCounts: await realCounts(),
    });
  }

  // Step 2 — write failed → attempt self-heal via exec_sql RPC
  const heal = await executeStatements(REPAIR_STATEMENTS);

  // Step 3 — retry
  const after = await writeReadRoundtrip();

  if (after.ok) {
    return NextResponse.json({
      verdict: 'REPAIRED',
      message: 'Persistence was broken, auto-repaired via exec_sql, now writing+reading correctly.',
      env,
      originalError: before.error,
      heal,
      writeTest: after,
      storedCounts: await realCounts(),
    });
  }

  // Step 4 — could not auto-heal → hand back paste-ready SQL
  return NextResponse.json({
    verdict: 'NEEDS_MANUAL_SQL',
    message:
      'Persistence is broken and could not be auto-repaired (exec_sql RPC not bootstrapped). ' +
      'Paste the SQL in `pasteThisOnceInSupabaseSqlEditor` into the Supabase SQL editor and run it once, then re-call this endpoint.',
    env,
    originalError: before.error,
    healAttempt: heal,
    retryError: after.error,
    sqlEditorUrl: `https://supabase.com/dashboard/project/${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '').split('.')[0]}/sql/new`,
    pasteThisOnceInSupabaseSqlEditor: PASTE_SQL,
  }, { status: 500 });
}
