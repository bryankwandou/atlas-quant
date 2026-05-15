/**
 * Auto Supabase Schema Migration
 * POST /api/admin/migrate?secret=<CRON_SECRET>
 *
 * Creates all required tables if they don't exist.
 * Safe to run multiple times (idempotent — uses CREATE TABLE IF NOT EXISTS).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/src/services/supabase';

const MIGRATION_SQL = `
-- ── market_ohlcv ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_ohlcv (
  id          bigserial PRIMARY KEY,
  symbol      text        NOT NULL,
  timeframe   text        NOT NULL,
  open_time   bigint      NOT NULL,
  open        numeric(24,8) NOT NULL,
  high        numeric(24,8) NOT NULL,
  low         numeric(24,8) NOT NULL,
  close       numeric(24,8) NOT NULL,
  volume      numeric(36,8) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_ohlcv_unique UNIQUE (symbol, timeframe, open_time)
);
CREATE INDEX IF NOT EXISTS idx_ohlcv_sym_tf ON market_ohlcv (symbol, timeframe, open_time DESC);

-- ── quant_signals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quant_signals (
  id              bigserial PRIMARY KEY,
  symbol          text        NOT NULL,
  timeframe       text        NOT NULL DEFAULT '1h',
  signal_type     text        NOT NULL,   -- 'BUY' | 'SELL' | 'NEUTRAL'
  confidence      numeric(5,2),
  regime          text,
  entry_price     numeric(24,8),
  sl              numeric(24,8),
  tp1             numeric(24,8),
  tp2             numeric(24,8),
  tp3             numeric(24,8),
  rr_ratio        numeric(8,4),
  atr_value       numeric(24,8),
  kelly_fraction  numeric(6,4),
  strategy        text,
  indicators      jsonb,
  macro_context   jsonb,
  votes           jsonb,
  is_active       boolean     NOT NULL DEFAULT true,
  generated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signals_sym_active ON quant_signals (symbol, is_active, generated_at DESC);

-- ── user_settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_pubkey       text        PRIMARY KEY,
  risk_per_trade    numeric(5,2) NOT NULL DEFAULT 1.0,
  max_daily_loss    numeric(5,2) NOT NULL DEFAULT 5.0,
  max_trades_day    int          NOT NULL DEFAULT 10,
  cooldown_minutes  int          NOT NULL DEFAULT 30,
  leverage_default  int          NOT NULL DEFAULT 1,
  preferred_tf      text         NOT NULL DEFAULT '1h',
  watchlist         text[]       NOT NULL DEFAULT ARRAY['BTCUSDT','ETHUSDT','AAPL','EURUSD=X'],
  theme             text         NOT NULL DEFAULT 'dark',
  language          text         NOT NULL DEFAULT 'en',
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

-- ── journal_entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id              bigserial   PRIMARY KEY,
  user_pubkey     text        NOT NULL REFERENCES user_settings(user_pubkey) ON DELETE CASCADE,
  symbol          text        NOT NULL,
  timeframe       text,
  signal_type     text,       -- 'BUY' | 'SELL'
  entry_price     numeric(24,8),
  exit_price      numeric(24,8),
  sl              numeric(24,8),
  tp              numeric(24,8),
  pnl_pct         numeric(10,4),
  outcome         text,       -- 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN'
  notes           text,
  tags            text[],
  signal_id       bigint      REFERENCES quant_signals(id),
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries (user_pubkey, opened_at DESC);

-- ── watchlist ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id          bigserial   PRIMARY KEY,
  user_pubkey text        NOT NULL,
  symbol      text        NOT NULL,
  asset_class text,
  added_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_unique UNIQUE (user_pubkey, symbol)
);

-- ── auto-update updated_at for user_settings ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── cleanup old OHLCV (keep last 5000 rows per symbol/timeframe) ─────────────
CREATE OR REPLACE FUNCTION cleanup_old_ohlcv()
RETURNS void AS $$
BEGIN
  DELETE FROM market_ohlcv WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY symbol, timeframe ORDER BY open_time DESC) rn
      FROM market_ohlcv
    ) sub WHERE rn > 5000
  );
END;
$$ language plpgsql;
`;

export async function POST(req: NextRequest) {
  // Require secret to prevent public access
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Execute migration via rpc — split into individual statements for Supabase
    const statements = MIGRATION_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    const results: { sql: string; ok: boolean; error?: string }[] = [];

    for (const stmt of statements) {
      try {
        const { error } = await admin.rpc('exec_sql', { sql: stmt + ';' }).single() as any;
        results.push({ sql: stmt.slice(0, 60) + '...', ok: !error, error: error?.message });
      } catch (e: any) {
        // Try direct query via postgrest if rpc not available
        results.push({ sql: stmt.slice(0, 60) + '...', ok: false, error: e.message });
      }
    }

    const failed = results.filter(r => !r.ok);
    return NextResponse.json({
      message: failed.length === 0 ? 'Migration complete' : 'Migration partial',
      total: results.length,
      succeeded: results.length - failed.length,
      failed: failed.length,
      details: results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET returns the migration SQL for review
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return new Response(MIGRATION_SQL, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
