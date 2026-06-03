-- =============================================================
-- ATLAS QUANT v2.0 — COMPLETE DATABASE SCHEMA
-- Jalankan di Supabase → SQL Editor (sekali jalan).
-- Idempotent: bisa di-run berulang tanpa merusak data.
-- =============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "btree_gin";

-- =============================================================
-- USERS (DUAL AUTH: WALLET + EMAIL/PASSWORD)
-- =============================================================
create table if not exists app_users (
    id              uuid primary key default uuid_generate_v4(),
    auth_method     text not null check (auth_method in ('wallet','email','admin')),
    email           text unique,
    username        text unique,
    password_hash   text,
    wallet_address  text unique,
    wallet_chain    text default 'solana',
    display_name    text,
    avatar_url      text,
    is_approved     boolean default false,
    is_admin        boolean default false,
    role            text default 'trader',
    last_login_at   timestamptz,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);
create index if not exists idx_users_wallet on app_users(wallet_address);
create index if not exists idx_users_email on app_users(email);

create table if not exists app_sessions (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references app_users(id) on delete cascade,
    token_hash      text not null unique,
    auth_method     text not null,
    ip_address      text,
    user_agent      text,
    expires_at      timestamptz not null,
    created_at      timestamptz default now()
);
create index if not exists idx_sessions_user on app_sessions(user_id);
create index if not exists idx_sessions_expires on app_sessions(expires_at);

-- =============================================================
-- ASSET REGISTRY (CRYPTO + STOCK + FOREX + INDEX + COMMODITY + DEX)
-- =============================================================
create table if not exists assets (
    id              bigserial primary key,
    symbol          text not null,
    base            text,
    quote           text,
    asset_class     text not null check (asset_class in (
                        'crypto','stock','forex','index','commodity','etf','dex','perp','futures','bond'
                    )),
    exchange        text,
    name            text not null,
    description     text,
    sector          text,
    industry        text,
    country         text,
    currency        text default 'USD',
    icon_url        text,
    decimals        int default 2,
    volume_24h      numeric(30,8) default 0,
    liquidity_usd   numeric(30,8) default 0,
    market_cap_usd  numeric(30,8) default 0,
    price_usd       numeric(30,8) default 0,
    is_tradable     boolean default true,
    is_listed       boolean default true,
    tags            text[] default '{}',
    aliases         text[] default '{}',
    search_vector   tsvector,
    metadata        jsonb default '{}',
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    unique(symbol, exchange, asset_class)
);
create index if not exists idx_assets_symbol on assets(symbol);
create index if not exists idx_assets_class on assets(asset_class);
create index if not exists idx_assets_exchange on assets(exchange);
create index if not exists idx_assets_search on assets using gin(search_vector);
create index if not exists idx_assets_trgm_name on assets using gin (name gin_trgm_ops);
create index if not exists idx_assets_trgm_sym on assets using gin (symbol gin_trgm_ops);
create index if not exists idx_assets_tags on assets using gin (tags);

create or replace function refresh_asset_search_vector() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.symbol,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.name,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.aliases, ' '),'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '),'')), 'D');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assets_search on assets;
create trigger trg_assets_search before insert or update on assets
  for each row execute procedure refresh_asset_search_vector();

-- =============================================================
-- MARKET OHLCV (multi-timeframe, multi-asset)
-- =============================================================
create table if not exists market_ohlcv (
    id              bigserial primary key,
    symbol          text not null,
    asset_class     text not null,
    exchange        text,
    timeframe       text not null,
    open_time       bigint not null,
    open            numeric(30,12) not null,
    high            numeric(30,12) not null,
    low             numeric(30,12) not null,
    close           numeric(30,12) not null,
    volume          numeric(30,8) default 0,
    quote_volume    numeric(30,8) default 0,
    trades_count    integer default 0,
    taker_buy_volume numeric(30,8) default 0,
    source          text default 'binance',
    created_at      timestamptz default now(),
    -- MUST match the app's upsert onConflict target (symbol,timeframe,open_time).
    -- A 4-col constraint here silently breaks every write — see /api/admin/db-doctor.
    unique(symbol, timeframe, open_time)
);
create index if not exists idx_ohlcv_lookup on market_ohlcv(symbol, timeframe, open_time desc);
create index if not exists idx_ohlcv_class on market_ohlcv(asset_class, timeframe);
-- Safety net: guarantees the 3-col ON CONFLICT target exists even on pre-existing tables.
create unique index if not exists market_ohlcv_stf_uidx on market_ohlcv(symbol, timeframe, open_time);

-- =============================================================
-- INDICATORS — registry + cache
-- =============================================================
create table if not exists indicators (
    id              bigserial primary key,
    code            text unique not null,
    name            text not null,
    name_id         text,
    category        text not null,
    sub_category    text,
    description     text,
    description_id  text,
    formula         text,
    inputs          jsonb default '[]',
    outputs         jsonb default '[]',
    overlay         boolean default false,
    needs_volume    boolean default false,
    pine_compat     boolean default false,
    source          text default 'builtin',
    author          text default 'atlas-quant',
    tags            text[] default '{}',
    risk_level      text default 'normal',
    created_at      timestamptz default now()
);
create index if not exists idx_indicators_category on indicators(category);
create index if not exists idx_indicators_tags on indicators using gin (tags);
create index if not exists idx_indicators_name on indicators using gin (name gin_trgm_ops);

create table if not exists indicator_cache (
    id              uuid primary key default uuid_generate_v4(),
    symbol          text not null,
    timeframe       text not null,
    indicator_code  text not null,
    params          jsonb default '{}',
    last_value      numeric(30,12),
    series          jsonb default '[]',
    computed_at     timestamptz default now(),
    expires_at      timestamptz not null,
    unique(symbol, timeframe, indicator_code, params)
);
create index if not exists idx_indicator_cache_lookup on indicator_cache(symbol, timeframe, indicator_code);
create index if not exists idx_indicator_cache_expiry on indicator_cache(expires_at);

-- =============================================================
-- QUANT SIGNALS
-- =============================================================
create table if not exists quant_signals (
    id              uuid primary key default uuid_generate_v4(),
    symbol          text not null,
    timeframe       text not null,
    asset_class     text,
    signal_type     text not null check (signal_type in ('BUY','SELL','LONG','SHORT','NEUTRAL','ALERT')),
    strategy        text not null,
    strategy_family text default 'core',
    confidence      numeric(5,2) not null,
    score           numeric(7,4),
    entry_price     numeric(30,12),
    tp1             numeric(30,12),
    tp2             numeric(30,12),
    tp3             numeric(30,12),
    sl              numeric(30,12),
    atr_value       numeric(30,12),
    rr_ratio        numeric(7,2),
    regime          text,
    indicators      jsonb default '{}',
    factors         jsonb default '{}',
    ai_provider     text,
    ai_model        text,
    ai_analysis     text,
    ai_score        numeric(5,2),
    smc_bias        text,
    ict_level       text,
    alt_data        jsonb default '{}',
    is_active       boolean default true,
    expires_at      timestamptz,
    user_id         uuid references app_users(id),
    generated_at    timestamptz default now()
);
create index if not exists idx_signals_sym_tf on quant_signals(symbol, timeframe, generated_at desc);
create index if not exists idx_signals_active on quant_signals(is_active, generated_at desc);
create index if not exists idx_signals_strategy on quant_signals(strategy);

-- =============================================================
-- TRADE JOURNAL
-- =============================================================
create table if not exists trade_journal (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references app_users(id) on delete cascade,
    symbol          text not null,
    direction       text not null check (direction in ('LONG','SHORT')),
    status          text default 'OPEN' check (status in ('OPEN','CLOSED','CANCELLED')),
    entry_price     numeric(30,12) not null,
    exit_price      numeric(30,12),
    quantity        numeric(30,12) not null,
    tp_price        numeric(30,12),
    sl_price        numeric(30,12),
    pnl             numeric(30,12),
    pnl_pct         numeric(9,4),
    fee             numeric(30,12) default 0,
    leverage        integer default 1,
    strategy_used   text,
    signal_id       uuid references quant_signals(id),
    notes           text,
    tags            text[] default '{}',
    entry_at        timestamptz default now(),
    exit_at         timestamptz,
    created_at      timestamptz default now()
);
create index if not exists idx_journal_user on trade_journal(user_id, entry_at desc);

-- =============================================================
-- WATCHLIST
-- =============================================================
create table if not exists watchlist (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references app_users(id) on delete cascade,
    symbol          text not null,
    asset_class     text not null,
    display_name    text,
    priority        integer default 0,
    alert_price     numeric(30,12),
    alert_type      text,
    note            text,
    created_at      timestamptz default now(),
    unique(user_id, symbol, asset_class)
);

-- =============================================================
-- USER SETTINGS (per-user)
-- =============================================================
create table if not exists user_settings (
    user_id         uuid primary key references app_users(id) on delete cascade,
    theme           text default 'dark',
    language        text default 'id',
    default_symbol  text default 'BTCUSDT',
    default_tf      text default '15m',
    active_indicators jsonb default '["EMA_9","EMA_21","VWAP","RSI_7","VOLUME_SPIKE"]',
    layout_config   jsonb default '{}',
    risk_per_trade  numeric(5,2) default 1.0,
    max_daily_loss  numeric(5,2) default 5.0,
    max_trades_day  integer default 10,
    cooldown_after_loss integer default 30,
    leverage_default integer default 1,
    exchange_pref   text default 'binance',
    notifications   jsonb default '{"telegram":false,"browser":true,"email":false}',
    api_keys        jsonb default '{}',
    updated_at      timestamptz default now()
);

-- =============================================================
-- RISK EVENTS
-- =============================================================
create table if not exists risk_events (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid references app_users(id),
    event_type      text not null,
    trigger_value   numeric(30,12),
    threshold       numeric(30,12),
    action_taken    text,
    details         jsonb default '{}',
    occurred_at     timestamptz default now()
);
create index if not exists idx_risk_user on risk_events(user_id, occurred_at desc);

-- =============================================================
-- PERFORMANCE STATS
-- =============================================================
create table if not exists performance_stats (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid references app_users(id),
    period          text not null,
    date_start      date not null,
    date_end        date not null,
    total_trades    integer default 0,
    wins            integer default 0,
    losses          integer default 0,
    win_rate        numeric(5,2),
    total_pnl       numeric(30,12),
    total_pnl_pct   numeric(9,4),
    max_drawdown    numeric(9,4),
    profit_factor   numeric(9,4),
    expectancy      numeric(30,12),
    sharpe_ratio    numeric(9,4),
    sortino_ratio   numeric(9,4),
    avg_rr          numeric(7,2),
    best_trade      numeric(30,12),
    worst_trade     numeric(30,12),
    computed_at     timestamptz default now(),
    unique(user_id, period, date_start)
);

-- =============================================================
-- ALTERNATIVE DATA (Renaissance-style external factors)
-- =============================================================
create table if not exists alt_data_factors (
    id              uuid primary key default uuid_generate_v4(),
    factor_code     text not null,
    factor_name     text not null,
    category        text not null check (category in (
                        'weather','politics','sentiment','onchain','macro','agri','energy',
                        'shipping','event','flow','liquidity','vol_index','calendar'
                    )),
    region          text,
    related_symbols text[] default '{}',
    value           numeric(30,12),
    value_label     text,
    impact_score    numeric(5,2),
    source          text,
    raw             jsonb default '{}',
    observed_at     timestamptz not null,
    created_at      timestamptz default now()
);
create index if not exists idx_alt_factor on alt_data_factors(factor_code, observed_at desc);
create index if not exists idx_alt_category on alt_data_factors(category, observed_at desc);

-- =============================================================
-- MAINTENANCE FUNCTIONS
-- =============================================================
create or replace function cleanup_old_data() returns void as $$
begin
  delete from market_ohlcv
  where (timeframe in ('1s','15s','30s') and open_time < extract(epoch from now() - interval '1 day') * 1000)
     or (timeframe in ('1m','3m','5m') and open_time < extract(epoch from now() - interval '7 days') * 1000)
     or (timeframe in ('15m','30m') and open_time < extract(epoch from now() - interval '30 days') * 1000)
     or (timeframe in ('1h','2h','4h') and open_time < extract(epoch from now() - interval '180 days') * 1000)
     or (timeframe = '1d' and open_time < extract(epoch from now() - interval '5 years') * 1000);

  delete from indicator_cache where expires_at < now();
  delete from app_sessions where expires_at < now();
  update quant_signals set is_active = false where expires_at < now() and is_active = true;
end;
$$ language plpgsql;

-- =============================================================
-- VIEWS
-- =============================================================
create or replace view v_latest_signals as
select distinct on (symbol, timeframe) *
from quant_signals
where is_active = true and (expires_at is null or expires_at > now())
order by symbol, timeframe, generated_at desc;

create or replace view v_top_assets as
select symbol, asset_class, exchange, name, price_usd, volume_24h, market_cap_usd, liquidity_usd
from assets
where is_listed = true and is_tradable = true
order by volume_24h desc nulls last;

-- =============================================================
-- ROW LEVEL SECURITY (PUBLIC READ + USER OWN WRITE)
-- =============================================================
alter table app_users enable row level security;
alter table trade_journal enable row level security;
alter table watchlist enable row level security;
alter table user_settings enable row level security;
alter table risk_events enable row level security;

alter table assets enable row level security;
create policy "public_assets_read" on assets for select using (true);

alter table indicators enable row level security;
create policy "public_indicators_read" on indicators for select using (true);

alter table market_ohlcv enable row level security;
create policy "public_ohlcv_read" on market_ohlcv for select using (true);

alter table quant_signals enable row level security;
create policy "public_signals_read" on quant_signals for select using (true);

alter table alt_data_factors enable row level security;
create policy "public_alt_data_read" on alt_data_factors for select using (true);
