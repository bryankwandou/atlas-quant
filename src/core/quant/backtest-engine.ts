import { OHLCVData, SignalResult, generateSignal } from './signal-engine';

export interface BacktestConfig {
  symbol: string; timeframe: string;
  strategies: string[];
  initialCapital: number;
  riskPerTradePct: number;
  commissionPct: number;
  slippagePct: number;
  startIndex: number;
}

export interface BacktestTrade {
  entryTime: number; exitTime: number;
  direction: 'LONG' | 'SHORT';
  entryPrice: number; exitPrice: number;
  quantity: number; pnl: number; pnlPct: number;
  commission: number; signal: string; exitReason: string;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  totalTrades: number;
  wins: number; losses: number; winRate: number;
  totalPnl: number; totalPnlPct: number;
  maxDrawdown: number; profitFactor: number;
  expectancy: number; sharpeRatio: number; sortinoRatio: number;
  avgRR: number; bestTrade: number; worstTrade: number;
  equityCurve: { time: number; equity: number }[];
  runDuration: number;
}

export async function runBacktest(candles: OHLCVData[], config: BacktestConfig): Promise<BacktestResult> {
  const startTime = Date.now();
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];

  let equity = config.initialCapital;
  let openTrade: any = null;
  const warmup = Math.max(config.startIndex, 50);

  for (let i = warmup; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const current = candles[i];

    if (openTrade) {
      const hitTP = openTrade.direction === 'LONG'
        ? current.high >= openTrade.tp1
        : current.low <= openTrade.tp1;
      const hitSL = openTrade.direction === 'LONG'
        ? current.low <= openTrade.sl
        : current.high >= openTrade.sl;

      if (hitTP || hitSL) {
        const exitPrice = hitTP ? openTrade.tp1 : openTrade.sl;
        const rawPnl = openTrade.direction === 'LONG'
          ? (exitPrice - openTrade.entryPrice) * openTrade.quantity
          : (openTrade.entryPrice - exitPrice) * openTrade.quantity;
        const commission = exitPrice * openTrade.quantity * (config.commissionPct / 100) * 2;
        const pnl = rawPnl - commission;

        equity += pnl;
        trades.push({
          entryTime: openTrade.entryTime, exitTime: current.time,
          direction: openTrade.direction,
          entryPrice: openTrade.entryPrice, exitPrice,
          quantity: openTrade.quantity, pnl,
          pnlPct: (pnl / config.initialCapital) * 100,
          commission, signal: openTrade.signal,
          exitReason: hitTP ? 'TP1' : 'SL',
        });
        openTrade = null;
      }
    }

    if (!openTrade) {
      const signal = generateSignal(slice, config.strategies);
      if (signal.type !== 'NEUTRAL' && signal.confidence >= 60) {
        const entryPrice = current.close * (1 + (config.slippagePct / 100) * (signal.type === 'BUY' ? 1 : -1));
        const riskAmount = equity * (config.riskPerTradePct / 100);
        const slDist = Math.abs(entryPrice - signal.sl);
        const quantity = slDist > 0 ? riskAmount / slDist : 0;

        if (quantity > 0) {
          openTrade = {
            entryTime: current.time,
            direction: signal.type === 'BUY' ? 'LONG' : 'SHORT',
            entryPrice, tp1: signal.tp1, sl: signal.sl,
            quantity, signal: signal.strategy,
          };
        }
      }
    }

    equityCurve.push({ time: current.time, equity });
  }

  return computeStats(trades, equityCurve, config, Date.now() - startTime);
}

function computeStats(
  trades: BacktestTrade[],
  equityCurve: { time: number; equity: number }[],
  config: BacktestConfig,
  runDuration: number
): BacktestResult {
  if (trades.length === 0) {
    return {
      config, trades, totalTrades: 0, wins: 0, losses: 0, winRate: 0,
      totalPnl: 0, totalPnlPct: 0, maxDrawdown: 0, profitFactor: 0,
      expectancy: 0, sharpeRatio: 0, sortinoRatio: 0, avgRR: 0,
      bestTrade: 0, worstTrade: 0, equityCurve, runDuration,
    };
  }

  const wins   = trades.filter(t => t.pnl > 0).length;
  const losses = trades.filter(t => t.pnl <= 0).length;
  const winRate = wins / trades.length;

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin  = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const expectancy = avgWin * winRate - avgLoss * (1 - winRate);

  let peak = config.initialCapital, maxDD = 0;
  for (const { equity } of equityCurve) {
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const pnls = trades.map(t => t.pnlPct);
  const avgPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const stdPnl = Math.sqrt(pnls.reduce((s, p) => s + (p - avgPnl) ** 2, 0) / pnls.length);
  const sharpeRatio = stdPnl > 0 ? (avgPnl / stdPnl) * Math.sqrt(252) : 0;

  const downsidePnls = pnls.filter(p => p < 0);
  const downsideStd = downsidePnls.length > 0
    ? Math.sqrt(downsidePnls.reduce((s, p) => s + p ** 2, 0) / downsidePnls.length)
    : 0;
  const sortinoRatio = downsideStd > 0 ? (avgPnl / downsideStd) * Math.sqrt(252) : 0;

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  return {
    config, trades, totalTrades: trades.length, wins, losses,
    winRate: parseFloat((winRate * 100).toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    totalPnlPct: parseFloat(((totalPnl / config.initialCapital) * 100).toFixed(2)),
    maxDrawdown: parseFloat((maxDD * 100).toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    avgRR: parseFloat((trades.reduce((s, t) => s + (t.pnl > 0 ? 1.5 : -1), 0) / trades.length).toFixed(2)),
    bestTrade: Math.max(...trades.map(t => t.pnl)),
    worstTrade: Math.min(...trades.map(t => t.pnl)),
    equityCurve, runDuration,
  };
}
