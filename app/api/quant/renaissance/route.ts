import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/utils/auth-middleware';

/**
 * Atlas Quant · Renaissance ensemble API
 * ------------------------------------------------------------------
 * GET /api/quant/renaissance?symbol=BTCUSDT&interval=1h
 *
 * Combines:
 *   - Technical ensemble (existing engine)
 *   - Crypto macro (existing aggregator)
 *   - Cross-asset macro feeds (DXY/VIX/curve/SPX/gold/oil…)
 *   - Sentiment (F&G / Reddit / trending)
 *   - GDELT political-risk + news tone
 *   - Weather (commodity-relevant)
 *   - On-chain (BTC/ETH/stablecoins)
 *
 * Returns a Renaissance composite signal with layer attribution and
 * Kelly-sized position recommendation.
 */
export async function GET(req: NextRequest) {
  const userKey = verifySessionToken(req);
  if (!userKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('interval') || '1h';

  try {
    const [
      { routeOHLCV },
      { runRenaissanceSignal },
      { getAggregatedMacro },
      external,
    ] = await Promise.all([
      import('@/src/lib/marketRouter'),
      import('@/src/core/quant/renaissance'),
      import('@/src/services/macro'),
      import('@/src/services/external'),
    ]);

    const [candlesRes, macroRes, macroFeedsRes, gdeltRes, weatherRes, onchainRes, fngRes, redditRes, trendingRes] = await Promise.allSettled([
      routeOHLCV(symbol, timeframe, 400),
      getAggregatedMacro(symbol),
      external.getMacroFeeds(),
      external.getGDELTPulse(),
      external.getWeatherMacro(),
      external.getOnChainSnapshot(),
      external.getFearGreed(),
      external.getRedditPulse(),
      external.getTrendingCoins(),
    ]);

    const cdl = candlesRes.status === 'fulfilled' ? candlesRes.value : [];
    if (!cdl || cdl.length < 50) {
      return NextResponse.json({ error: 'Insufficient candle data', symbol }, { status: 422 });
    }

    const macro = macroRes.status === 'fulfilled' ? macroRes.value : null;
    const macroFeeds = macroFeedsRes.status === 'fulfilled' ? macroFeedsRes.value : null;
    const gdelt = gdeltRes.status === 'fulfilled' ? gdeltRes.value : null;
    const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
    const onchain = onchainRes.status === 'fulfilled' ? onchainRes.value : null;
    const fng = fngRes.status === 'fulfilled' ? fngRes.value : null;
    const reddit = redditRes.status === 'fulfilled' ? redditRes.value : null;
    const trending = trendingRes.status === 'fulfilled' ? trendingRes.value : [];

    const ctx = {
      fearGreedValue: fng?.value ?? macro?.fearGreed?.value,
      vix: macroFeeds?.vix?.price ?? macro?.macro?.vix ?? undefined,
      macroRegimeScore: macro?.macro?.regimeScore,
      fundingRatePct: macro?.fundingRate?.fundingRatePct,
      longShortRatio: macro?.openInterest?.longShortRatio ?? undefined,
      eventRisk: macro?.eventCalendar?.riskLevel,
      rateEnvironment: macro?.centralBank?.rateEnvironment,
      compositeMultiplier: macro?.confidenceMultiplier,

      // Macro feeds
      dxyChangePct: macroFeeds?.dxy?.changePercent ?? undefined,
      spxChangePct: macroFeeds?.spx?.changePercent ?? undefined,
      goldChangePct: macroFeeds?.gold?.changePercent ?? undefined,
      oilChangePct: macroFeeds?.oilWTI?.changePercent ?? undefined,
      yieldCurve: macroFeeds?.yieldCurve ?? undefined,
      macroRiskScore: macroFeeds?.macroRiskScore,

      // Sentiment
      redditAttention: reddit?.attentionScore,

      // News / politics
      gdeltToneIndex: gdelt?.toneIndex,
      politicalRiskIndex: gdelt?.politicalRiskIndex,

      // Weather
      weatherStressIndex: weather?.weatherStressIndex,
      weatherCommodityScore: weather?.commodityImpactScore,

      // On-chain
      ethGasGwei: onchain?.ethereum?.gasGwei ?? undefined,
      stablePct24h: onchain?.stablecoins?.pct24h ?? undefined,
      btcMempoolPending: onchain?.bitcoin?.mempoolPendingTx ?? undefined,
    };

    const normalized = cdl.map((c: any) => ({
      time: c.time ?? Math.floor((c.open_time ?? 0) / 1000),
      open: Number(c.open), high: Number(c.high), low: Number(c.low),
      close: Number(c.close), volume: Number(c.volume ?? 0),
    }));

    const signal = runRenaissanceSignal(normalized, ctx, symbol);

    return NextResponse.json({
      symbol,
      timeframe,
      signal,
      context: {
        macro: macro ? {
          compositeScore: macro.compositeScore,
          macroRegime: macro.macroRegime,
          tradingRecommendation: macro.tradingRecommendation,
        } : null,
        macroFeeds: macroFeeds ? {
          dxy: macroFeeds.dxy, vix: macroFeeds.vix, move: macroFeeds.move,
          yieldCurve: macroFeeds.yieldCurve, us10y: macroFeeds.us10y, us2y: macroFeeds.us2y,
          gold: macroFeeds.gold, oilWTI: macroFeeds.oilWTI, natGas: macroFeeds.natGas,
          spx: macroFeeds.spx, nasdaq: macroFeeds.nasdaq,
          btcDominance: macroFeeds.btcDominance, ethDominance: macroFeeds.ethDominance,
          macroRiskScore: macroFeeds.macroRiskScore,
          notes: macroFeeds.notes,
        } : null,
        gdelt: gdelt ? {
          toneIndex: gdelt.toneIndex,
          politicalRiskIndex: gdelt.politicalRiskIndex,
          articles: gdelt.articles,
          notes: gdelt.notes,
        } : null,
        weather: weather ? {
          stressIndex: weather.weatherStressIndex,
          commodityImpactScore: weather.commodityImpactScore,
          samples: weather.samples,
          notes: weather.notes,
        } : null,
        onchain: onchain ? {
          bitcoin: onchain.bitcoin,
          ethereum: onchain.ethereum,
          stablecoins: onchain.stablecoins,
          notes: onchain.notes,
        } : null,
        sentiment: {
          fng: fng,
          reddit: reddit,
          trendingCoins: trending,
        },
      },
      version: '2.1.0',
      engine: 'ATLAS_RENAISSANCE_V1',
    });
  } catch (e: any) {
    console.error('[renaissance]', e);
    return NextResponse.json({ error: e.message || 'Engine error' }, { status: 500 });
  }
}
