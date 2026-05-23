import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';

/**
 * POST /api/admin/backtest    body: { symbols?: string[]; timeframe?: string; minConfidence?: number }
 *
 * Runs walk-forward backtest of the Renaissance composite signal on
 * one or many symbols. Reports actual win-rate / RR / Sharpe / max DD.
 *
 * Triggered from admin console — no human runs anything manually.
 */
export async function POST(req: NextRequest) {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const symbols: string[] = Array.isArray(body.symbols) && body.symbols.length
      ? body.symbols
      : ['BTCUSDT','ETHUSDT','SOLUSDT','AAPL','TSLA','SPY'];
    const timeframe = body.timeframe || '1h';
    const minConfidence = typeof body.minConfidence === 'number' ? body.minConfidence : 60;

    const { runBacktest } = await import('@/src/services/admin/backtest');
    const results = [];
    for (const sym of symbols.slice(0, 12)) {
      try {
        const r = await runBacktest(sym.toUpperCase(), timeframe, { minConfidence });
        results.push(r);
      } catch (e: any) {
        results.push({ symbol: sym, timeframe, error: e?.message ?? 'backtest failed' });
      }
    }

    const totalTrades = results.reduce((a, r: any) => a + (r.trades ?? 0), 0);
    const totalWins   = results.reduce((a, r: any) => a + (r.wins   ?? 0), 0);
    const aggWinRate  = totalTrades > 0 ? totalWins / totalTrades : 0;
    const avgSharpe   = results.reduce((a, r: any) => a + (r.sharpe ?? 0), 0) / Math.max(1, results.length);
    const avgExpect   = results.reduce((a, r: any) => a + (r.expectancy ?? 0), 0) / Math.max(1, results.length);

    return NextResponse.json({
      ran: results.length,
      timeframe,
      minConfidence,
      aggregate: {
        totalTrades,
        totalWins,
        winRate: parseFloat(aggWinRate.toFixed(4)),
        avgSharpe: parseFloat(avgSharpe.toFixed(3)),
        avgExpectancy: parseFloat(avgExpect.toFixed(5)),
      },
      perSymbol: results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Backtest error' }, { status: 500 });
  }
}
