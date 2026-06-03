// Collect REAL sub-minute candles into Neon.
// Vercel is geo-blocked from Binance (451), so sub-second data must be gathered
// off-Vercel (this machine / GitHub Actions runner) and written to Neon, which
// the app reads from. Fetches paginated 1s from Binance, aggregates to
// 5s/10s/15s/30s/45s, and upserts all timeframes.
//
// Env: DATABASE_URL (Neon). Reads .env.local if present.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

let DB = process.env.DATABASE_URL;
if (!DB) {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) DB = m[1].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
if (!DB || !DB.includes('neon.tech')) { console.error('No Neon DATABASE_URL'); process.exit(1); }
const sql = neon(DB);

const SYMBOLS = (process.env.SYMBOLS || 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT').split(',');
// data-api.binance.vision is NOT geo-blocked (works from GitHub/Vercel runners)
const BINANCE = ['https://data-api.binance.vision/api/v3','https://api4.binance.com/api/v3','https://api3.binance.com/api/v3','https://api.binance.com/api/v3'];
const PAGES = Number(process.env.PAGES || 8); // 8*1000 = 8000s ≈ 2.2h of 1s per run

async function fetch1s(sym) {
  let end = Date.now(), all = [];
  for (let p = 0; p < PAGES; p++) {
    let raw = null;
    for (const b of BINANCE) {
      try {
        const r = await fetch(`${b}/klines?symbol=${sym}&interval=1s&limit=1000&endTime=${end}`, { signal: AbortSignal.timeout(8000) });
        if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length) { raw = j; break; } }
      } catch {}
    }
    if (!raw) break;
    all = raw.concat(all);
    end = raw[0][0] - 1;
    if (raw.length < 1000) break;
  }
  return all.map(k => ({ open_time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
}

function aggregate(base, sec) {
  const ms = sec * 1000, m = new Map();
  for (const c of base) {
    const bt = Math.floor(c.open_time / ms) * ms;
    const e = m.get(bt);
    if (!e) m.set(bt, { open_time: bt, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
    else { e.high = Math.max(e.high, c.high); e.low = Math.min(e.low, c.low); e.close = c.close; e.volume += c.volume; }
  }
  return [...m.values()].sort((a, b) => a.open_time - b.open_time);
}

async function write(sym, tf, rows) {
  if (!rows.length) return 0;
  const chunk = 400; let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const s = rows.slice(i, i + chunk), v = [], p = [];
    s.forEach((r, j) => { const b = j * 9; v.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`);
      p.push(sym, 'crypto', tf, r.open_time, r.open, r.high, r.low, r.close, r.volume); });
    await sql.query(`INSERT INTO market_ohlcv (symbol,asset_class,timeframe,open_time,open,high,low,close,volume) VALUES ${v.join(',')}
      ON CONFLICT (symbol,timeframe,open_time) DO UPDATE SET high=EXCLUDED.high,low=EXCLUDED.low,close=EXCLUDED.close,volume=EXCLUDED.volume`, p);
    n += s.length;
  }
  return n;
}

const AGG = { '5s': 5, '10s': 10, '15s': 15, '30s': 30, '45s': 45 };

(async () => {
  console.log('Collecting real sub-minute → Neon. symbols:', SYMBOLS.join(','), 'pages:', PAGES);
  for (const sym of SYMBOLS) {
    const base = await fetch1s(sym);
    if (!base.length) { console.log(sym, '-> no 1s data'); continue; }
    let line = `${sym}: 1s=${await write(sym, '1s', base)}`;
    for (const [tf, sec] of Object.entries(AGG)) line += ` ${tf}=${await write(sym, tf, aggregate(base, sec))}`;
    const span = ((base[base.length-1].open_time - base[0].open_time) / 60000).toFixed(0);
    console.log(line + ` | 1s span=${span}min ${new Date(base[0].open_time).toISOString().slice(11,19)}→${new Date(base[base.length-1].open_time).toISOString().slice(11,19)}`);
  }
  console.log('DONE');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
