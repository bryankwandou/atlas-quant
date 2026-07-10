/**
 * T1MO VERIFIABLE BACKTEST — bukti yang bisa diaudit, bukan janji.
 *
 * GET /api/backtest/verify?symbol=BTCUSDT&tf=1h&limit=1500&horizon=100
 *
 * Metodologi (walk-forward, anti lookahead):
 *   1. Hitung T1MO atas seluruh history (bullProb/positionPct kausal per bar).
 *   2. Sinyal = classifier yang SAMA dengan chart & Arbiter Bridge, dengan
 *      persistence 3 bar + cooldown 20 bar (sama dengan marker di chart).
 *   3. Setiap sinyal dieksekusi sebagai trade rencana ATR14 yang sama dengan
 *      Arbiter: entry = close bar sinyal, SL = 1.5×ATR, TP = 2.5×ATR.
 *   4. Scan bar-bar BERIKUTNYA: SL tersentuh dulu = LOSS (-1R), TP dulu = WIN
 *      (+1.67R). Bar yang menyentuh keduanya dihitung LOSS (asumsi konservatif).
 *      Tidak tersentuh sampai `horizon` bar = TIMEOUT, exit di close (R aktual).
 *   5. Setiap trade dikembalikan lengkap (waktu, entry, SL, TP, exit, R) supaya
 *      pengguna bisa mencocokkan bar-per-bar dengan chart. Tidak ada angka
 *      yang tidak bisa dilacak asalnya.
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv, type Timeframe } from '@/services/market/provider';
import { t1moCompute } from '@/core/indicators/t1mo';

export const dynamic = 'force-dynamic';

// Classifier identik dengan chart / arbiter (satu sumber semantik).
function classify(bp: number, pos: number): { badge: string; action: 'BUY' | 'SELL' | 'HOLD' } {
  if (bp >= 72)              return { badge: 'Hawk1 Detected', action: 'BUY'  };
  if (bp >= 58)              return { badge: 'Green Bull',     action: 'BUY'  };
  if (bp <= 30 && pos >= 70) return { badge: 'Break Top Box',  action: 'BUY'  };
  if (bp <= 42 && pos <= 30) return { badge: 'Spec Buy',       action: 'BUY'  };
  if (bp <= 42)              return { badge: 'Short Setup',    action: 'SELL' };
  return { badge: 'NEUTRAL', action: 'HOLD' };
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const symbol  = (u.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
    const tf      = (u.searchParams.get('tf') || '1h') as Timeframe;
    const limit   = Math.min(Number(u.searchParams.get('limit') ?? 1500), 3000);
    const horizon = Math.min(Math.max(Number(u.searchParams.get('horizon') ?? 100), 10), 500);

    const candles = await fetchOhlcv({ symbol, timeframe: tf, limit });
    if (candles.length < 120) {
      return NextResponse.json({ error: `insufficient history (${candles.length} bars)` }, { status: 422 });
    }
    const time  = candles.map((c) => c.time);
    const open  = candles.map((c) => c.open);
    const high  = candles.map((c) => c.high);
    const low   = candles.map((c) => c.low);
    const close = candles.map((c) => c.close);
    const volume = candles.map((c) => c.volume);
    const n = close.length;

    const t1mo = t1moCompute({ open, high, low, close, volume, time }, {});
    if (!t1mo.meta.ready) return NextResponse.json({ error: 't1mo not ready' }, { status: 422 });
    const bullProb = (t1mo.series.bullProb as number[]) ?? [];
    const posPct   = (t1mo.series.positionPct as number[]) ?? [];

    // ATR14 rolling (Wilder) — sama dengan arbiter plan.
    const atr = new Array<number>(n).fill(NaN);
    let a = 0;
    for (let i = 1; i < n; i++) {
      const tr = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
      a = i === 1 ? tr : (a * 13 + tr) / 14;
      if (i >= 14) atr[i] = a;
    }

    // ── Replay sinyal: persistence 3 bar + cooldown 20 bar (identik marker chart) ──
    const WARMUP = 60, PERSIST = 3, COOLDOWN = 20;
    type Trade = {
      idx: number; time: number; action: 'BUY' | 'SELL'; badge: string;
      bullProb: number; entry: number; stopLoss: number; takeProfit: number;
      exitIdx: number; exitTime: number; exitPrice: number;
      result: 'WIN' | 'LOSS' | 'TIMEOUT'; rMultiple: number; barsHeld: number;
    };
    const trades: Trade[] = [];
    let streakAction: string = 'HOLD'; let streak = 0; let lastSignalIdx = -Infinity;

    for (let i = WARMUP; i < n - 1; i++) {
      const sig = classify(bullProb[i] ?? 50, posPct[i] ?? 50);
      if (sig.action === streakAction) streak++; else { streakAction = sig.action; streak = 1; }
      if (sig.action === 'HOLD' || streak < PERSIST || i - lastSignalIdx < COOLDOWN) continue;
      if (!Number.isFinite(atr[i]) || atr[i] <= 0) continue;
      lastSignalIdx = i;

      const long = sig.action === 'BUY';
      const entry = close[i];
      const sl = long ? entry - 1.5 * atr[i] : entry + 1.5 * atr[i];
      const tp = long ? entry + 2.5 * atr[i] : entry - 2.5 * atr[i];

      // Eksekusi maju — bar sinyal TIDAK ikut (entry di close bar sinyal).
      let exitIdx = -1; let result: Trade['result'] = 'TIMEOUT'; let exitPrice = NaN;
      const end = Math.min(n - 1, i + horizon);
      for (let j = i + 1; j <= end; j++) {
        const hitSL = long ? low[j] <= sl : high[j] >= sl;
        const hitTP = long ? high[j] >= tp : low[j] <= tp;
        if (hitSL) { exitIdx = j; exitPrice = sl; result = 'LOSS'; break; } // konservatif: SL menang saat ambigu
        if (hitTP) { exitIdx = j; exitPrice = tp; result = 'WIN'; break; }
      }
      if (exitIdx < 0) { exitIdx = end; exitPrice = close[end]; }
      const risk = Math.abs(entry - sl);
      const rMultiple = risk > 0 ? (long ? exitPrice - entry : entry - exitPrice) / risk : 0;

      trades.push({
        idx: i, time: time[i], action: sig.action as 'BUY' | 'SELL', badge: sig.badge,
        bullProb: Math.round(bullProb[i]), entry: rd(entry), stopLoss: rd(sl), takeProfit: rd(tp),
        exitIdx, exitTime: time[exitIdx], exitPrice: rd(exitPrice),
        result, rMultiple: Number(rMultiple.toFixed(2)), barsHeld: exitIdx - i,
      });
    }

    // ── Metrik agregat ──
    const wins   = trades.filter((t) => t.rMultiple > 0);
    const losses = trades.filter((t) => t.rMultiple <= 0);
    const grossWin  = wins.reduce((s, t) => s + t.rMultiple, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.rMultiple, 0));
    let equity = 0, peak = 0, maxDD = 0;
    const equityCurve = trades.map((t) => {
      equity += t.rMultiple; peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
      return { time: t.exitTime, equityR: Number(equity.toFixed(2)) };
    });

    return NextResponse.json({
      source: 'ATLAS-QUANT/t1mo-verify', version: 1,
      symbol, timeframe: tf, bars: n,
      periodStart: time[0], periodEnd: time[n - 1],
      methodology: 'walk-forward; classifier & rencana ATR identik dengan chart/Arbiter; persistence 3 bar, cooldown 20 bar; SL diprioritaskan saat SL+TP tersentuh di bar yang sama (konservatif)',
      metrics: {
        totalTrades: trades.length,
        wins: wins.length,
        losses: losses.length,
        winRatePct: trades.length ? Number(((wins.length / trades.length) * 100).toFixed(1)) : 0,
        profitFactor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : (grossWin > 0 ? Infinity : 0),
        expectancyR: trades.length ? Number((equity / trades.length).toFixed(3)) : 0,
        netR: Number(equity.toFixed(2)),
        maxDrawdownR: Number(maxDD.toFixed(2)),
        avgBarsHeld: trades.length ? Math.round(trades.reduce((s, t) => s + t.barsHeld, 0) / trades.length) : 0,
      },
      equityCurve,
      trades,
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal', detail: String(e) }, { status: 500 });
  }
}

const rd = (v: number) => Number(v.toPrecision(8));
