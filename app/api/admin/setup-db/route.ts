import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SCHEMA_SQL = `
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

create table if not exists app_users (
  id             uuid primary key default uuid_generate_v4(),
  auth_method    text not null default 'email',
  email          text unique,
  username       text unique,
  password_hash  text,
  wallet_address text unique,
  display_name   text,
  is_approved    boolean default false,
  is_admin       boolean default false,
  role           text default 'trader',
  last_login_at  timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table if not exists market_ohlcv (
  id             bigint generated always as identity primary key,
  symbol         text        not null,
  asset_class    text        not null default 'crypto',
  timeframe      text        not null,
  open_time      bigint      not null,
  open           numeric(30,12) not null,
  high           numeric(30,12) not null,
  low            numeric(30,12) not null,
  close          numeric(30,12) not null,
  volume         numeric(30,8) default 0,
  close_time     bigint default 0,
  quote_volume   numeric(30,8) default 0,
  trades_count   integer default 0,
  source         text default 'live',
  created_at     timestamptz default now(),
  constraint market_ohlcv_unique unique (symbol, timeframe, open_time)
);
create index if not exists idx_ohlcv_lookup on market_ohlcv(symbol, timeframe, open_time desc);

create table if not exists quant_signals (
  id             uuid primary key default uuid_generate_v4(),
  symbol         text not null,
  timeframe      text not null,
  signal_type    text not null,
  confidence     numeric(5,2) default 50,
  strategy       text,
  regime         text,
  entry_price    numeric(30,12),
  tp1            numeric(30,12),
  tp2            numeric(30,12),
  tp3            numeric(30,12),
  sl             numeric(30,12),
  rr_ratio       numeric(7,2),
  atr_value      numeric(30,12),
  indicators     jsonb default '{}',
  is_active      boolean default true,
  generated_at   timestamptz default now(),
  expires_at     timestamptz
);
create index if not exists idx_signals_lookup on quant_signals(symbol, is_active, generated_at desc);

create table if not exists user_settings (
  user_id        uuid primary key references app_users(id) on delete cascade,
  theme          text default 'dark',
  language       text default 'id',
  default_symbol text default 'BTCUSDT',
  default_tf     text default '15m',
  risk_per_trade numeric(5,2) default 1.0,
  max_daily_loss numeric(5,2) default 5.0,
  max_trades_day integer default 10,
  cooldown_after_loss integer default 30,
  preferences    jsonb default '{}',
  updated_at     timestamptz default now()
);

create table if not exists trade_journal (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references app_users(id) on delete cascade,
  symbol         text not null,
  direction      text not null,
  status         text default 'OPEN',
  entry_price    numeric(30,12) not null,
  exit_price     numeric(30,12),
  quantity       numeric(30,12) not null,
  tp_price       numeric(30,12),
  sl_price       numeric(30,12),
  pnl            numeric(30,12),
  pnl_pct        numeric(9,4),
  strategy_used  text,
  notes          text,
  entry_at       timestamptz default now(),
  exit_at        timestamptz,
  created_at     timestamptz default now()
);
create index if not exists idx_journal_user on trade_journal(user_id, entry_at desc);

-- RLS
alter table market_ohlcv  enable row level security;
alter table quant_signals enable row level security;
alter table app_users     enable row level security;
alter table user_settings enable row level security;
alter table trade_journal enable row level security;

drop policy if exists "ohlcv_public_read"    on market_ohlcv;
drop policy if exists "signals_public_read"  on quant_signals;
drop policy if exists "ohlcv_service_all"    on market_ohlcv;
drop policy if exists "signals_service_all"  on quant_signals;

create policy "ohlcv_public_read"   on market_ohlcv  for select to anon, authenticated using (true);
create policy "ohlcv_service_all"   on market_ohlcv  for all    to service_role using (true) with check (true);
create policy "signals_public_read" on quant_signals  for select to anon, authenticated using (true);
create policy "signals_service_all" on quant_signals  for all    to service_role using (true) with check (true);
`;

async function execSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { success: false, error: 'Supabase env vars missing' };
  }

  // Use Supabase Management API (requires service role)
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  // Try via rpc exec_sql function (may not exist — handled below)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({ sql }),
  }).catch(() => null);

  if (res?.ok) {
    return { success: true };
  }

  // Fallback: derive project ref from URL and try management API
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const mgmtRes = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  }).catch(() => null);

  if (mgmtRes?.ok) {
    return { success: true };
  }

  return { success: false, error: 'SQL execution failed — use Supabase SQL Editor to run supabase/schema.sql manually' };
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await execSQL(SCHEMA_SQL);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Database schema created successfully. All tables are ready.',
    });
  }

  return NextResponse.json({
    success: false,
    message: result.error,
    manual_sql_url: `https://supabase.com/dashboard/project/${SUPABASE_URL.replace('https://', '').split('.')[0]}/sql`,
    instructions: 'Open the URL above, paste contents of supabase/schema.sql, and run it.',
  }, { status: 500 });
}

// Also load historical OHLCV data on POST
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pairs = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT'];
  const timeframes = ['1d','4h','1h','15m'];
  const results: string[] = [];

  for (const symbol of pairs) {
    for (const tf of timeframes) {
      try {
        const limit = tf === '1d' ? 3000 : tf === '4h' ? 2000 : 1000;
        const url = `${req.nextUrl.origin}/api/market/ohlcv?symbol=${symbol}&timeframe=${tf}&limit=${limit}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        results.push(`${symbol}/${tf}: ${data.count ?? 0} candles`);
      } catch {
        results.push(`${symbol}/${tf}: failed`);
      }
    }
  }

  return NextResponse.json({ success: true, loaded: results });
}
