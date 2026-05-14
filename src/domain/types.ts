export interface OHLCV {
  symbol: string;
  asset_class: 'crypto' | 'stock' | 'forex';
  timeframe: string;
  open_time: number;
  open: number; high: number; low: number; close: number;
  volume: number;
  close_time?: number;
  quote_volume?: number;
  trades_count?: number;
}

export interface QuantSignal {
  id?: string;
  symbol: string;
  timeframe: string;
  signal_type: 'BUY' | 'SELL' | 'NEUTRAL' | 'ALERT';
  strategy: string;
  confidence: number;
  entry_price?: number;
  tp1?: number; tp2?: number; tp3?: number;
  sl?: number;
  atr_value?: number;
  rr_ratio?: number;
  indicators?: Record<string, number>;
  ai_analysis?: string;
  ai_score?: number;
  regime?: string;
  smc_bias?: string;
  generated_at?: string;
  expires_at?: string;
  is_active?: boolean;
  user_id?: string;
}

export interface TradeJournal {
  id?: string;
  user_pubkey: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  tp_price?: number;
  sl_price?: number;
  pnl?: number;
  pnl_pct?: number;
  fee?: number;
  leverage?: number;
  strategy_used?: string;
  signal_id?: string;
  notes?: string;
  entry_at?: string;
  exit_at?: string;
}

export interface UserSettings {
  user_pubkey: string;
  theme: 'light' | 'dark';
  language: 'id' | 'en';
  default_symbol: string;
  default_tf: string;
  active_indicators: string[];
  risk_per_trade: number;
  max_daily_loss: number;
  max_trades_day: number;
  cooldown_after_loss: number;
  leverage_default: number;
  exchange_pref: string;
}

export interface Watchlist {
  id?: string;
  user_pubkey: string;
  symbol: string;
  asset_class: 'crypto' | 'stock' | 'forex';
  display_name?: string;
  priority?: number;
  alert_enabled?: boolean;
  alert_price?: number;
  alert_type?: 'above' | 'below' | 'pct_change';
}

export interface PerformanceStats {
  user_pubkey: string;
  period: 'daily' | 'weekly' | 'monthly';
  date_start: string;
  date_end: string;
  total_trades: number;
  wins: number; losses: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_pct: number;
  max_drawdown: number;
  profit_factor: number;
  expectancy: number;
  sharpe_ratio: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
}
