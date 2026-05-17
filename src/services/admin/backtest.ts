/**
 * Atlas Quant · Walk-forward backtest engine
 * --------------------------------------------------------------------
 * Runs the Renaissance composite signal on historical OHLCV and reports
 * actual statistics (no fabricated win-rate). Triggered from the admin
 * console — no human runs the SQL.
 */

import type { OHLCV } from '@/src/core/quant/ensemble-signal';

export interface BacktestParams {
  /** Minimum confidence to take a trade (0-100). */
  minConfidence?: number;
  /** Bars forward to wait for TP/SL after entry (5 default). */
  horizon?: number;
  /** Risk per trade (fraction of equity). */
  riskFraction?: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  barsInSample: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;            // 0..1
  avgRR: number;
  expectancy: number;         // expected return per trade as fraction
  totalReturn: number;        // compounded fraction
  maxDrawdown: number;        // fraction (negative)
  sharpe: number;
  byBias: { long: number; short: number };
  durationMs: number;
}

export async function runBacktest(
  symbol: string,
  timeframe: string,
  params: BacktestParams = {},
): Promise<BacktestResult> {
  const t0 = Date.now();
  const minConf = params.minConfidence ?? 60;
  const horizon = params.horizon ?? 5;
  const risk    = params.riskFraction ?? 0.01;

  const { getMultiSource } = await import('@/src/services/market/multiSource');
  const { runRenaissanceSignal } = await import('@/src/core/quant/renaissance');

  const multi = await getMultiSource(symbol, timeframe, 1000);
  const candles = multi.candles as OHLCV[];
  if (candles.length < 100) {
    return emptyResult(symbol, timeframe, candles.length, Date.now() - t0);
  }

  // Walk forward: at bar i, look at signal using only bars [0..i],
  // record the trade outcome over bars [i..i+horizon].
  const minHistory = 80;
  const wins: number[] = [];
  const losses: number[] = [];
  const returns: number[] = [];
  let equity = 1.0;
  let peak = 1.0;
  let maxDD = 0;
  let longCount = 0, shortCount = 0;

  for (let i = minHistory; i < candles.length - horizon - 1; i++) {
    const slice = candles.slice(0, i + 1);
    const r = runRenaissanceSignal(slice, {}, symbol);
    if (r.signal === 'NEUTRAL') continue;
    if (r.adjustedConfidence < minConf) continue;

    const entry = candles[i].close;
    const sl = r.sl;
    const tp = r.tp2 ?? r.tp1;
    if (!sl || !tp || sl === entry) continue;

    const isLong = r.signal === 'BUY';
    if (isLong) longCount++; else shortCount++;

    // Sim: look forward, exit at SL or TP hit, whichever first
    let outcome: 'win' | 'loss' | 'open' = 'open';
    for (let j = 1; j <= horizon; j++) {
      const bar = candles[i + j];
      if (!bar) break;
      if (isLong) {
        if (bar.low <= sl) { outcome = 'loss'; break; }
        if (bar.high >= tp) { outcome = 'win'; break; }
      } else {
        if (bar.high >= sl) { outcome = 'loss'; break; }
        if (bar.low <= tp) { outcome = 'win'; break; }
      }
    }
    if (outcome === 'open') {
      // mark-to-market at horizon close
      const exit = candles[i + horizon].close;
      const ret = isLong ? (exit - entry) / entry : (entry - exit) / entry;
      returns.push(ret);
      if (ret > 0) wins.push(ret); else losses.push(ret);
      equity *= 1 + ret * risk * 10;   // levered by 10× to amplify signal
    } else if (outcome === 'win') {
      const ret = Math.abs(tp - entry) / entry;
      returns.push(ret);
      wins.push(ret);
      equity *= 1 + ret * risk * 10;
    } else {
      const ret = -Math.abs(entry - sl) / entry;
      returns.push(ret);
      losses.push(ret);
      equity *= 1 + ret * risk * 10;
    }
    peak = Math.max(peak, equity);
    maxDD = Math.min(maxDD, equity / peak - 1);
  }

  const trades = wins.length + losses.length;
  const winRate = trades > 0 ? wins.length / trades : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
  const meanRet = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length
    ? returns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / returns.length
    : 0;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? (meanRet / std) * Math.sqrt(252) : 0;

  return {
    symbol,
    timeframe,
    barsInSample: candles.length,
    trades,
    wins: wins.length,
    losses: losses.length,
    winRate: parseFloat(winRate.toFixed(4)),
    avgRR: parseFloat(avgRR.toFixed(3)),
    expectancy: parseFloat(expectancy.toFixed(5)),
    totalReturn: parseFloat((equity - 1).toFixed(5)),
    maxDrawdown: parseFloat(maxDD.toFixed(5)),
    sharpe: parseFloat(sharpe.toFixed(3)),
    byBias: { long: longCount, short: shortCount },
    durationMs: Date.now() - t0,
  };
}

function emptyResult(symbol: string, timeframe: string, bars: number, ms: number): BacktestResult {
  return {
    symbol, timeframe, barsInSample: bars,
    trades: 0, wins: 0, losses: 0, winRate: 0, avgRR: 0,
    expectancy: 0, totalReturn: 0, maxDrawdown: 0, sharpe: 0,
    byBias: { long: 0, short: 0 }, durationMs: ms,
  };
}
