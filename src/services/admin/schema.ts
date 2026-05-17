/**
 * Atlas Quant · Database schema (single source of truth)
 * --------------------------------------------------------------------
 * The full Postgres DDL from ATLAS_QUANT_MEGAPROMPT. Held in code so it
 * can be executed programmatically by /api/admin/migrate — no human
 * must open the Supabase SQL editor.
 */

export const ATLAS_SCHEMA_SQL = `
-- Atlas Quant — full schema (idempotent, safe to re-run)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Market OHLCV
CREATE TABLE IF NOT EXISTS market_ohlcv (
  id            BIGSERIAL PRIMARY KEY,
  symbol        TEXT NOT NULL,
  asset_class   TEXT NOT NULL,
  timeframe     TEXT NOT NULL,
  open_time     BIGINT NOT NULL,
  open          NUMERIC(20,8) NOT NULL,
  high          NUMERIC(20,8) NOT NULL,
  low           NUMERIC(20,8) NOT NULL,
  close         NUMERIC(20,8) NOT NULL,
  volume        NUMERIC(30,8) NOT NULL DEFAULT 0,
  close_time    BIGINT,
  quote_volume  NUMERIC(30,8) DEFAULT 0,
  trades_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, timeframe, open_time)
);
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_tf_time ON market_ohlcv(symbol, timeframe, open_time DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_asset_class     ON market_ohlcv(asset_class, symbol, timeframe);

-- 2) Indicators cache
CREATE TABLE IF NOT EXISTS indicators_cache (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol        TEXT NOT NULL,
  timeframe     TEXT NOT NULL,
  indicator     TEXT NOT NULL,
  params        JSONB DEFAULT '{}',
  data          JSONB NOT NULL,
  computed_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, timeframe, indicator, params)
);
CREATE INDEX IF NOT EXISTS idx_indicators_expires ON indicators_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_indicators_lookup  ON indicators_cache(symbol, timeframe, indicator);

-- 3) Quant signals
CREATE TABLE IF NOT EXISTS quant_signals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol        TEXT NOT NULL,
  timeframe     TEXT NOT NULL,
  signal_type   TEXT NOT NULL,
  strategy      TEXT NOT NULL,
  confidence    NUMERIC(5,2) NOT NULL,
  entry_price   NUMERIC(20,8),
  tp1           NUMERIC(20,8),
  tp2           NUMERIC(20,8),
  tp3           NUMERIC(20,8),
  sl            NUMERIC(20,8),
  atr_value     NUMERIC(20,8),
  rr_ratio      NUMERIC(5,2),
  indicators    JSONB DEFAULT '{}',
  ai_analysis   TEXT,
  ai_score      NUMERIC(5,2),
  regime        TEXT,
  smc_bias      TEXT,
  ict_level     TEXT,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  user_id       TEXT
);
CREATE INDEX IF NOT EXISTS idx_signals_symbol_tf ON quant_signals(symbol, timeframe, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_active    ON quant_signals(is_active, generated_at DESC);

-- 4) Trade journal
CREATE TABLE IF NOT EXISTS trade_journal (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pubkey   TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  direction     TEXT NOT NULL,
  status        TEXT DEFAULT 'OPEN',
  entry_price   NUMERIC(20,8) NOT NULL,
  exit_price    NUMERIC(20,8),
  quantity      NUMERIC(20,8) NOT NULL,
  tp_price      NUMERIC(20,8),
  sl_price      NUMERIC(20,8),
  pnl           NUMERIC(20,8),
  pnl_pct       NUMERIC(8,4),
  fee           NUMERIC(20,8) DEFAULT 0,
  leverage      INTEGER DEFAULT 1,
  strategy_used TEXT,
  signal_id     UUID REFERENCES quant_signals(id),
  notes         TEXT,
  entry_at      TIMESTAMPTZ DEFAULT NOW(),
  exit_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_user ON trade_journal(user_pubkey, entry_at DESC);

-- 5) Risk events
CREATE TABLE IF NOT EXISTS risk_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pubkey   TEXT,
  event_type    TEXT NOT NULL,
  trigger_value NUMERIC(20,8),
  threshold     NUMERIC(20,8),
  action_taken  TEXT,
  details       JSONB,
  occurred_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6) Performance stats
CREATE TABLE IF NOT EXISTS performance_stats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pubkey   TEXT NOT NULL,
  period        TEXT NOT NULL,
  date_start    DATE NOT NULL,
  date_end      DATE NOT NULL,
  total_trades  INTEGER DEFAULT 0,
  wins          INTEGER DEFAULT 0,
  losses        INTEGER DEFAULT 0,
  win_rate      NUMERIC(5,2),
  total_pnl     NUMERIC(20,8),
  total_pnl_pct NUMERIC(8,4),
  max_drawdown  NUMERIC(8,4),
  profit_factor NUMERIC(8,4),
  expectancy    NUMERIC(20,8),
  sharpe_ratio  NUMERIC(8,4),
  avg_rr        NUMERIC(5,2),
  best_trade    NUMERIC(20,8),
  worst_trade   NUMERIC(20,8),
  computed_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_pubkey, period, date_start)
);

-- 7) Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pubkey   TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  asset_class   TEXT NOT NULL DEFAULT 'crypto',
  display_name  TEXT,
  priority      INTEGER DEFAULT 0,
  alert_enabled BOOLEAN DEFAULT FALSE,
  alert_price   NUMERIC(20,8),
  alert_type    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_pubkey, symbol)
);

-- 8) User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_pubkey         TEXT PRIMARY KEY,
  theme               TEXT DEFAULT 'light',
  language            TEXT DEFAULT 'id',
  default_symbol      TEXT DEFAULT 'BTCUSDT',
  default_tf          TEXT DEFAULT '15m',
  active_indicators   JSONB DEFAULT '["EMA_9","EMA_21","VWAP","RSI_7","VOLUME_SPIKE"]',
  layout_config       JSONB DEFAULT '{}',
  risk_per_trade      NUMERIC(5,2) DEFAULT 1.0,
  max_daily_loss      NUMERIC(5,2) DEFAULT 5.0,
  max_trades_day      INTEGER DEFAULT 10,
  cooldown_after_loss INTEGER DEFAULT 30,
  leverage_default    INTEGER DEFAULT 1,
  exchange_pref       TEXT DEFAULT 'binance',
  notifications       JSONB DEFAULT '{"telegram":false,"browser":true}',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 9) Backtest runs (auto-generated by /api/admin/backtest)
CREATE TABLE IF NOT EXISTS backtest_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol          TEXT NOT NULL,
  timeframe       TEXT NOT NULL,
  strategy        TEXT NOT NULL DEFAULT 'renaissance',
  bars_in_sample  INTEGER NOT NULL,
  trades          INTEGER NOT NULL,
  wins            INTEGER NOT NULL,
  losses          INTEGER NOT NULL,
  win_rate        NUMERIC(6,3) NOT NULL,
  avg_rr          NUMERIC(6,3) NOT NULL,
  expectancy      NUMERIC(10,5) NOT NULL,
  total_return    NUMERIC(10,5) NOT NULL,
  max_drawdown    NUMERIC(10,5) NOT NULL,
  sharpe_ratio    NUMERIC(10,5) NOT NULL,
  details         JSONB,
  ran_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backtest_symbol_tf ON backtest_runs(symbol, timeframe, ran_at DESC);

-- 10) ML model weights (auto-trained logistic ensemble snapshots)
CREATE TABLE IF NOT EXISTS ml_model_weights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name      TEXT NOT NULL,
  version         INTEGER NOT NULL,
  weights         JSONB NOT NULL,
  bias            NUMERIC(12,6) NOT NULL,
  trained_on      INTEGER NOT NULL,
  accuracy        NUMERIC(6,3),
  notes           TEXT,
  trained_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, version)
);

-- Views
CREATE OR REPLACE VIEW v_latest_signals AS
SELECT DISTINCT ON (symbol, timeframe) *
FROM quant_signals
WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY symbol, timeframe, generated_at DESC;

CREATE OR REPLACE VIEW v_journal_stats AS
SELECT
  user_pubkey,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS total_trades,
  COUNT(*) FILTER (WHERE status = 'CLOSED' AND pnl > 0) AS wins,
  COUNT(*) FILTER (WHERE status = 'CLOSED' AND pnl <= 0) AS losses,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'CLOSED' AND pnl > 0)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE status = 'CLOSED'), 0) * 100, 2
  ) AS win_rate,
  COALESCE(SUM(pnl) FILTER (WHERE status = 'CLOSED'), 0) AS total_pnl,
  COALESCE(MAX(pnl) FILTER (WHERE status = 'CLOSED'), 0) AS best_trade,
  COALESCE(MIN(pnl) FILTER (WHERE status = 'CLOSED'), 0) AS worst_trade
FROM trade_journal
GROUP BY user_pubkey;

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_ohlcv() RETURNS void AS $$
BEGIN
  DELETE FROM market_ohlcv
  WHERE (timeframe IN ('1s','15s','30s') AND open_time < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day')   * 1000)
     OR (timeframe IN ('1m','3m','5m')   AND open_time < EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')  * 1000)
     OR (timeframe IN ('15m','30m')      AND open_time < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000)
     OR (timeframe IN ('1h','2h','4h')   AND open_time < EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days') * 1000)
     OR (timeframe = '1d'                AND open_time < EXTRACT(EPOCH FROM NOW() - INTERVAL '1095 days') * 1000);
  DELETE FROM indicators_cache WHERE expires_at < NOW();
  UPDATE quant_signals SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- RLS — public reads, service-role writes
ALTER TABLE market_ohlcv    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quant_signals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_journal   ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_weights ENABLE ROW LEVEL SECURITY;

DO $rls$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'public_read_ohlcv') THEN
    CREATE POLICY "public_read_ohlcv" ON market_ohlcv FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'service_write_ohlcv') THEN
    CREATE POLICY "service_write_ohlcv" ON market_ohlcv FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'public_read_signals') THEN
    CREATE POLICY "public_read_signals" ON quant_signals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'service_write_signals') THEN
    CREATE POLICY "service_write_signals" ON quant_signals FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'public_read_backtests') THEN
    CREATE POLICY "public_read_backtests" ON backtest_runs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'public_read_ml_weights') THEN
    CREATE POLICY "public_read_ml_weights" ON ml_model_weights FOR SELECT USING (true);
  END IF;
END $rls$;
`;

/**
 * Splits the schema into individual statements on top-level semicolons,
 * respecting dollar-quoted bodies (PL/pgSQL) so the function body and
 * DO blocks remain intact.
 */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  let dollarTag: string | null = null;
  while (i < sql.length) {
    const c = sql[i];
    if (dollarTag) {
      // Inside a dollar-quoted body; look for closing tag
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    // Look for opening dollar tag (e.g. $$, $body$, $rls$)
    if (c === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        dollarTag = m[0];
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    if (c === ';') {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out.filter((s) => !/^\s*--/.test(s));
}
