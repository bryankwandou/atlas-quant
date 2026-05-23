/**
 * ATLAS-QUANT · Regime Detection API (v2 — Macro-Enhanced)
 *
 * GET /api/quant/regime?symbol=BTCUSDT&timeframe=15m
 *
 * Returns the current market regime enriched with macro context:
 * {
 *   regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT',
 *   adx: number,
 *   trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS',
 *   riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
 *   macroScore: number,
 *   marketBias: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL',
 *   riskFlags: string[],
 *   ...
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateMacroEnhancedSignal } from '@/src/core/quant/macro-signal';
import { getAllMacroData } from '@/src/services/macroData';
import { routeOHLCV } from '@/src/lib/marketRouter';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = (searchParams.get('symbol') ?? 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('timeframe') ?? '15m';

  try {
    const [candles, macroData] = await Promise.all([
      routeOHLCV(symbol, timeframe, 200),
      getAllMacroData(),
    ]);

    if (!candles || candles.length < 50) {
      return NextResponse.json(
        { error: `Insufficient data for ${symbol} ${timeframe}` },
        { status: 400 },
      );
    }

    const closes  = candles.map(c => c.close);
    const highs   = candles.map(c => c.high);
    const lows    = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    const signal = await generateMacroEnhancedSignal(
      closes, highs, lows, volumes, symbol, macroData,
    );

    return NextResponse.json({
      symbol,
      timeframe,
      // Core regime fields
      regime:      signal.regime,
      adx:         signal.adx,
      rsi:         signal.rsi,
      trend:       signal.trend,
      // Macro overlay
      macroScore:  signal.macroScore,
      macroSignal: signal.macroSignal,
      marketBias:  macroData.marketBias,
      riskLevel:   macroData.riskLevel,
      // Composite signal summary
      finalSignal: signal.finalSignal,
      confidence:  signal.confidence,
      accuracy:    signal.accuracy,
      // Risk flags
      riskFlags:   signal.riskFlags,
      // Key macro components
      macro: {
        fearGreed:    macroData.fearGreed.value,
        fearGreedLabel: macroData.fearGreed.label,
        vix:          macroData.macro.vix ?? null,
        fedFundsRate: macroData.macro.fedFundsRate,
        yieldCurve:   macroData.macro.yieldCurve10y2y,
        cpi:          macroData.macro.cpi,
        geopolitical: macroData.geopolitical.score,
        geopoliticalTrend: macroData.geopolitical.trend,
        hasHighImpactEvent: macroData.calendar.hasHighImpactToday,
        upcomingCBEvents: macroData.centralBank.slice(0, 3).map(e => ({
          bank: e.bank,
          date: e.date,
          event: e.event,
        })),
      },
      // Price levels (for UI display)
      price: closes[closes.length - 1],
      tp1:   signal.tp1,
      tp2:   signal.tp2,
      tp3:   signal.tp3,
      sl:    signal.sl,
      rrRatio: signal.rrRatio,
      // Votes breakdown
      votes: signal.votes,
      timestamp: signal.timestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Regime detection failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
