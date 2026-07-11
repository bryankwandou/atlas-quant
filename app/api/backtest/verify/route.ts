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
    // ── Parameter tuning (grid-search-able) ──
    // minProb : conviction gate — BUY butuh bullProb ≥ minProb, SELL butuh ≤ (100-minProb).
    //           Menghapus sinyal lemah/kontrarian (Spec Buy / Break Top Box).
    // trend=1 : regime filter — BUY hanya saat close > EMA50, SELL hanya saat close < EMA50.
    // sl / tp : pengali ATR14. RR = tp/sl; breakeven WR = sl/(sl+tp).
    // dir     : long | short | both.
    // hours   : jam UTC yang diizinkan, csv (seasonality kalender ala quant, mis. "12,13,14,15").
    const minProb = Math.min(Math.max(Number(u.searchParams.get('minProb') ?? 0), 0), 100);
    const trendF  = u.searchParams.get('trend') === '1';
    const slX     = Math.min(Math.max(Number(u.searchParams.get('sl') ?? 1.5), 0.3), 6);
    const tpX     = Math.min(Math.max(Number(u.searchParams.get('tp') ?? 2.5), 0.3), 10);
    const dir     = (u.searchParams.get('dir') || 'both') as 'long' | 'short' | 'both';
    const hours   = (u.searchParams.get('hours') || '').split(',').map((h) => parseInt(h, 10)).filter((h) => h >= 0 && h <= 23);
    // split : fraksi data awal sebagai TRAIN (in-sample). Sisanya TEST (out-of-sample).
    //         Grid search cari config di train; angka test = bukti jujur (belum pernah dilihat
    //         saat tuning). Default 0.7. split=1 → semua in-sample (perilaku lama).
    const split   = Math.min(Math.max(Number(u.searchParams.get('split') ?? 1), 0.3), 1);

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

    // EMA50 untuk regime/trend filter.
    const ema50 = new Array<number>(n).fill(NaN);
    { const k = 2 / 51; let e = close[0];
      for (let i = 0; i < n; i++) { e = i === 0 ? close[0] : close[i] * k + e * (1 - k); if (i >= 49) ema50[i] = e; } }

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
      const long = sig.action === 'BUY';
      // ── Gerbang tuning (semua opsional; default = perilaku standar) ──
      if (dir === 'long' && !long) continue;
      if (dir === 'short' && long) continue;
      if (minProb > 0 && (long ? (bullProb[i] ?? 50) < minProb : (bullProb[i] ?? 50) > 100 - minProb)) continue;
      if (trendF && Number.isFinite(ema50[i]) && (long ? close[i] <= ema50[i] : close[i] >= ema50[i])) continue;
      if (hours.length && !hours.includes(new Date(time[i]).getUTCHours())) continue;
      lastSignalIdx = i;

      const entry = close[i];
      const sl = long ? entry - slX * atr[i] : entry + slX * atr[i];
      const tp = long ? entry + tpX * atr[i] : entry - tpX * atr[i];

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

    // ── Metrik agregat (helper: dipakai untuk all / train / test) ──
    const splitIdx = Math.floor(n * split);        // bar sinyal < splitIdx = TRAIN, sisanya TEST
    const splitTime = time[Math.min(splitIdx, n - 1)];
    const trainTrades = trades.filter((t) => t.idx <  splitIdx);
    const testTrades  = trades.filter((t) => t.idx >= splitIdx);

    const metricsOf = (ts: Trade[]) => {
      const wins   = ts.filter((t) => t.rMultiple > 0);
      const losses = ts.filter((t) => t.rMultiple <= 0);
      const grossWin  = wins.reduce((s, t) => s + t.rMultiple, 0);
      const grossLoss = Math.abs(losses.reduce((s, t) => s + t.rMultiple, 0));
      let equity = 0, peak = 0, maxDD = 0;
      const equityCurve = ts.map((t) => {
        equity += t.rMultiple; peak = Math.max(peak, equity);
        maxDD = Math.max(maxDD, peak - equity);
        return { time: t.exitTime, equityR: Number(equity.toFixed(2)) };
      });
      return {
        metrics: {
          totalTrades: ts.length,
          wins: wins.length,
          losses: losses.length,
          winRatePct: ts.length ? Number(((wins.length / ts.length) * 100).toFixed(1)) : 0,
          profitFactor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : (grossWin > 0 ? Infinity : 0),
          expectancyR: ts.length ? Number((equity / ts.length).toFixed(3)) : 0,
          netR: Number(equity.toFixed(2)),
          maxDrawdownR: Number(maxDD.toFixed(2)),
          avgBarsHeld: ts.length ? Math.round(ts.reduce((s, t) => s + t.barsHeld, 0) / ts.length) : 0,
        },
        equityCurve,
      };
    };

    const all   = metricsOf(trades);
    const train = metricsOf(trainTrades);
    const test  = metricsOf(testTrades);
    const breakevenWR = Number(((slX / (slX + tpX)) * 100).toFixed(1));

    // Verdict jujur. Edge NYATA butuh DUA syarat: (1) selectable di TRAIN — kalau di
    // train saja sudah rugi, tuning tak akan pernah memilihnya, jadi menang di test =
    // kebetulan regime, bukan edge; (2) bertahan di TEST (out-of-sample). Memisahkan
    // OVERFIT (train menang, test kalah) dari TEST_LUCK (train kalah, test kebetulan menang).
    const testOK  = test.metrics.totalTrades >= 15 && test.metrics.winRatePct >= breakevenWR && Number(test.metrics.profitFactor) > 1;
    const trainOK = train.metrics.totalTrades >= 15 && train.metrics.netR > 0 && train.metrics.winRatePct >= breakevenWR;
    const verdict = split >= 1 ? 'IN_SAMPLE_ONLY'
      : test.metrics.totalTrades < 15 ? 'INSUFFICIENT_TEST'
      : trainOK && testOK  ? 'EDGE_HOLDS_OOS'   // untung di train, bertahan di test → dipakai
      : trainOK && !testOK ? 'OVERFIT'          // train menang, test kalah → jangan dipakai
      : !trainOK && testOK ? 'TEST_LUCK'        // train rugi, test kebetulan menang → bukan edge
      : 'NO_EDGE';

    return NextResponse.json({
      source: 'ATLAS-QUANT/t1mo-verify', version: 3,
      config: { minProb, trend: trendF, sl: slX, tp: tpX, dir, hours, horizon, split,
        breakevenWinRatePct: breakevenWR },
      symbol, timeframe: tf, bars: n,
      periodStart: time[0], periodEnd: time[n - 1],
      split: { fraction: split, splitIdx, splitTime,
        trainPeriod: [time[0], splitTime], testPeriod: [splitTime, time[n - 1]] },
      verdict,
      methodology: 'walk-forward; classifier & rencana ATR identik dengan chart/Arbiter; persistence 3 bar, cooldown 20 bar; SL diprioritaskan saat SL+TP tersentuh di bar yang sama (konservatif). Split by indeks bar sinyal (T1MO kausal) → train (in-sample, dipakai tuning) vs test (out-of-sample, belum pernah dilihat).',
      metrics: all.metrics,          // gabungan (kompatibel v2)
      train:   train.metrics,        // in-sample
      test:    test.metrics,         // OUT-OF-SAMPLE — angka yang layak dipercaya
      equityCurve: all.equityCurve,
      trades,
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal', detail: String(e) }, { status: 500 });
  }
}

const rd = (v: number) => Number(v.toPrecision(8));
