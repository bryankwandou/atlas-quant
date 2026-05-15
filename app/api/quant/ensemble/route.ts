import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/utils/auth-middleware';

export async function GET(req: NextRequest) {
  const userKey = verifySessionToken(req);
  if (!userKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol    = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('interval') || '1h';
  const useMacro  = searchParams.get('macro') !== 'false';

  try {
    const { routeOHLCV } = await import('@/src/lib/marketRouter');
    const { runEnsembleSignal } = await import('@/src/core/quant/ensemble-signal');
    const { getAggregatedMacro } = await import('@/src/services/macro');

    const [candles, macroData] = await Promise.allSettled([
      routeOHLCV(symbol, timeframe, 300),
      useMacro ? getAggregatedMacro(symbol) : Promise.resolve(null),
    ]);

    const cdl = candles.status === 'fulfilled' ? candles.value : [];
    if (!cdl || cdl.length < 50) {
      return NextResponse.json({ error: 'Insufficient candle data', symbol }, { status: 422 });
    }

    const macro = macroData.status === 'fulfilled' ? macroData.value : null;

    // Build MacroContext from AggregatedMacro
    const ctx = macro ? {
      fearGreedValue: macro.fearGreed?.value,
      vix: macro.macro?.vix ?? undefined,
      macroRegimeScore: macro.macro?.regimeScore,
      fundingRatePct: macro.fundingRate?.fundingRatePct,
      longShortRatio: macro.openInterest?.longShortRatio ?? undefined,
      eventRisk: macro.eventCalendar?.riskLevel,
      rateEnvironment: macro.centralBank?.rateEnvironment,
      compositeMultiplier: macro.confidenceMultiplier,
    } : undefined;

    // Normalize candle shape to OHLCV (add `time` from open_time)
    const normalized = cdl.map((c: any) => ({
      time: c.time ?? Math.floor((c.open_time ?? 0) / 1000),
      open: Number(c.open), high: Number(c.high), low: Number(c.low),
      close: Number(c.close), volume: Number(c.volume ?? 0),
    }));
    const signal = runEnsembleSignal(normalized, ctx);

    return NextResponse.json({
      symbol, timeframe,
      signal,
      macro: macro ? {
        compositeScore: macro.compositeScore,
        macroRegime: macro.macroRegime,
        tradingRecommendation: macro.tradingRecommendation,
        notes: macro.notes,
        fearGreed: macro.fearGreed ? { value: macro.fearGreed.value, label: macro.fearGreed.label } : null,
        vix: macro.macro?.vix,
        eventRisk: macro.eventCalendar?.riskLevel,
        rateEnvironment: macro.centralBank?.rateEnvironment,
        fundingRate: macro.fundingRate ? { pct: macro.fundingRate.fundingRatePct, sentiment: macro.fundingRate.sentiment } : null,
      } : null,
      version: '2.0.0',
      engine: 'ENSEMBLE_MULTI_FACTOR',
    });
  } catch (e: any) {
    console.error('[ensemble]', e);
    return NextResponse.json({ error: e.message || 'Engine error' }, { status: 500 });
  }
}
