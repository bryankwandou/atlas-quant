/**
 * ARBITER BRIDGE — machine-readable T1MO signal feed for the Arbiter trading bot.
 *
 * GET /api/arbiter/signal?symbol=BNBUSDT&tf=1h
 * GET /api/arbiter/signal?symbols=BTCUSDT,ETHUSDT,BNBUSDT&tf=15m   (batch scan)
 * GET /api/arbiter/signal?symbol=BTCUSDT&tf=1h&push=1              (also POST to webhook)
 *
 * Auth (optional): if env ARBITER_API_KEY is set, requests must send header
 *   x-arbiter-key: <key>   — otherwise the endpoint is open (read-only market math).
 *
 * Response per symbol:
 *   action    BUY | SELL | HOLD           — derived from the same classifier the chart uses
 *   badge     Hawk1 Detected / Green Bull / Spec Buy / Short Setup / NEUTRAL
 *   bullProb  0..100 — T1MO bull probability at the last closed bar
 *   plan      { entry, stopLoss, takeProfit, riskReward } — ATR(14)-based suggestion
 *
 * Auto-trade loop: the bot polls this endpoint (or receives webhook pushes when
 * push=1 is called by a cron) and executes via its own exchange API keys (ccxt).
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv, type Timeframe } from '@/services/market/provider';
import { t1moCompute } from '@/core/indicators/t1mo';

export const dynamic = 'force-dynamic';

// Same thresholds as the chart's classifyT1moSignal (single source of semantics).
function classify(bp: number, pos: number): { badge: string; action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } {
  if (bp >= 72)              return { badge: 'Hawk1 Detected', action: 'BUY',  confidence: Math.min(1, bp / 100) };
  if (bp >= 58)              return { badge: 'Green Bull',     action: 'BUY',  confidence: bp / 100 };
  if (bp <= 30 && pos >= 70) return { badge: 'Break Top Box',  action: 'BUY',  confidence: 0.5 };
  if (bp <= 42 && pos <= 30) return { badge: 'Spec Buy',       action: 'BUY',  confidence: 0.45 };
  if (bp <= 42)              return { badge: 'Short Setup',    action: 'SELL', confidence: (100 - bp) / 100 };
  return { badge: 'NEUTRAL', action: 'HOLD', confidence: 0 };
}

function atr14(high: number[], low: number[], close: number[]): number {
  const n = close.length;
  if (n < 15) return NaN;
  let atr = 0;
  const k = 2 / 15;
  for (let i = 1; i < n; i++) {
    const tr = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    atr = i === 1 ? tr : tr * k + atr * (1 - k);
  }
  return atr;
}

async function signalFor(symbol: string, tf: Timeframe, limit: number) {
  const candles = await fetchOhlcv({ symbol, timeframe: tf, limit });
  if (!candles.length) return { symbol, error: 'no market data' };

  const ctx = {
    open:   candles.map((c) => c.open),
    high:   candles.map((c) => c.high),
    low:    candles.map((c) => c.low),
    close:  candles.map((c) => c.close),
    volume: candles.map((c) => c.volume),
    time:   candles.map((c) => c.time),
  };
  const t1mo = t1moCompute(ctx, {});
  if (!t1mo.meta.ready) return { symbol, error: 't1mo not ready (insufficient history)' };

  const i = ctx.close.length - 1;
  const bp  = (t1mo.series.bullProb as number[])?.[i] ?? 50;
  const pos = (t1mo.series.positionPct as number[])?.[i] ?? 50;
  const sig = classify(bp, pos);
  const price = ctx.close[i];

  // 24h context derived from the same candle history (no extra API call):
  // bars-per-24h from the median bar gap → chg% vs 24h ago + quote-volume 24h.
  const gapMs = i > 0 ? Math.max(1, ctx.time[i] - ctx.time[i - 1]) : 3_600_000;
  const per24 = Math.max(1, Math.round(86_400_000 / gapMs));
  const prevIdx = Math.max(0, i - per24);
  const chg24hPct = ctx.close[prevIdx] > 0 ? (price / ctx.close[prevIdx] - 1) * 100 : 0;
  let volUsd24h = 0;
  for (let j = prevIdx + 1; j <= i; j++) volUsd24h += (ctx.volume[j] ?? 0) * (ctx.close[j] ?? 0);
  const atr = atr14(ctx.high, ctx.low, ctx.close);
  const long = sig.action !== 'SELL';
  const plan = Number.isFinite(atr) ? {
    entry:      round(price),
    stopLoss:   round(long ? price - 1.5 * atr : price + 1.5 * atr),
    takeProfit: round(long ? price + 2.5 * atr : price - 2.5 * atr),
    riskReward: 1.67,
    atr14:      round(atr),
  } : null;

  return {
    symbol,
    timeframe: tf,
    barTime: ctx.time[i],
    price: round(price),
    chg24hPct: Number(chg24hPct.toFixed(2)),
    volUsd24h: Math.round(volUsd24h),
    bullProb: round(bp),
    positionPct: round(pos),
    action: sig.action,
    badge: sig.badge,
    confidence: Number(sig.confidence.toFixed(2)),
    plan,
  };
}

const round = (v: number) => Number(v.toPrecision(8));

export async function GET(req: Request) {
  try {
    const key = process.env.ARBITER_API_KEY;
    if (key && req.headers.get('x-arbiter-key') !== key) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const u = new URL(req.url);
    const tf = (u.searchParams.get('tf') || '1h') as Timeframe;
    const limit = Math.min(Number(u.searchParams.get('limit') ?? 400), 1500);
    const many = (u.searchParams.get('symbols') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const one = (u.searchParams.get('symbol') || (many.length ? '' : 'BTCUSDT')).toUpperCase();
    const syms = many.length ? many.slice(0, 12) : [one];

    const signals = await Promise.all(syms.map((s) => signalFor(s, tf, limit).catch((e) => ({ symbol: s, error: String(e) }))));
    const payload = {
      source: 'ATLAS-QUANT/arbiter-bridge',
      version: 1,
      generatedAt: new Date().toISOString(),
      signals,
    };

    // push=1 → forward the payload to the Arbiter bot's webhook (auto-trading mode).
    // Configure ARBITER_WEBHOOK_URL in Vercel env; call this route from a cron.
    if (u.searchParams.get('push') === '1' && process.env.ARBITER_WEBHOOK_URL) {
      try {
        await fetch(process.env.ARBITER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-atlas-source': 'arbiter-bridge' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
        });
        (payload as any).pushed = true;
      } catch (e) {
        (payload as any).pushed = false;
        (payload as any).pushError = String(e);
      }
    }

    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: 'internal', detail: String(e) }, { status: 500 });
  }
}
