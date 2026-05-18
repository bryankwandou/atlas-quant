/**
 * Atlas Quant · External-factor pipeline
 * --------------------------------------------------------------------
 * Aggregates LIVE numbers from all existing external sources
 *   (GDELT, OpenMeteo, alternative.me F&G, Binance funding/OI, macro feeds,
 *    Reddit pulse, Google Trends)
 * into the exact shape consumed by runRenaissanceSignal, so the
 * `macro`, `sentiment`, `political`, `weather`, `onchain` and
 * `microstructure` layers are populated from real data instead of
 * defaulting to zero.
 *
 * Field names mirror RenaissanceContext exactly (see core/quant/renaissance).
 */

import type { RenaissanceContext } from '@/src/core/quant/renaissance';

type Settled<T> = PromiseSettledResult<T>;
const v = <T>(r: Settled<T>): any => (r.status === 'fulfilled' ? r.value : undefined);

export async function buildLiveContext(symbol: string): Promise<RenaissanceContext> {
  const ctx: RenaissanceContext = {};

  const [extMod, macroMod] = await Promise.all([
    import('@/src/services/external'),
    import('@/src/services/macro'),
  ]);

  const calls = await Promise.allSettled([
    (extMod as any).getGDELTPulse?.()         ?? Promise.resolve(null),
    (extMod as any).getWeatherMacro?.()       ?? Promise.resolve(null),
    (extMod as any).getFearGreed?.()          ?? Promise.resolve(null),
    (extMod as any).getRedditPulse?.()        ?? Promise.resolve(null),
    (extMod as any).getTrendingTopics?.()     ?? Promise.resolve(null),
    (extMod as any).getOnChainSnapshot?.()    ?? Promise.resolve(null),
    (extMod as any).getMacroFeeds?.()         ?? Promise.resolve(null),
    (macroMod as any).getVix?.()              ?? Promise.resolve(null),
    (macroMod as any).getFundingRate?.(symbol)?? Promise.resolve(null),
    (macroMod as any).getOpenInterest?.(symbol)?? Promise.resolve(null),
  ]);
  const [gdelt, weather, fng, reddit, trends, onchain, feeds, vix, funding, oi] = calls;

  const g = v(gdelt), w = v(weather), f = v(fng), r = v(reddit), tr = v(trends);
  const o = v(onchain), m = v(feeds), vx = v(vix), fnd = v(funding), op = v(oi);

  // ── Political / news ──
  if (typeof g?.politicalRiskIndex === 'number') ctx.politicalRiskIndex = g.politicalRiskIndex;
  if (typeof g?.toneIndex === 'number')          ctx.gdeltToneIndex = g.toneIndex;
  else if (typeof g?.gdeltTone === 'number')     ctx.gdeltToneIndex = g.gdeltTone;

  // ── Weather ──
  if (typeof w?.weatherStressIndex === 'number') ctx.weatherStressIndex = w.weatherStressIndex;
  if (typeof w?.weatherCommodityScore === 'number') ctx.weatherCommodityScore = w.weatherCommodityScore;

  // ── Sentiment ──
  if (typeof f?.value === 'number') ctx.fearGreedValue = f.value;
  else if (typeof f === 'number')   ctx.fearGreedValue = f;
  if (typeof r?.attentionScore === 'number') ctx.redditAttention = r.attentionScore;
  else if (typeof r?.score === 'number')     ctx.redditAttention = r.score;
  if (typeof tr?.searchTrend === 'number')   ctx.searchTrend = tr.searchTrend;
  else if (typeof tr?.heat === 'number')     ctx.searchTrend = tr.heat;

  // ── Macro / cross-asset ──
  if (typeof m?.dxyChangePct === 'number')   ctx.dxyChangePct = m.dxyChangePct;
  if (typeof m?.spxChangePct === 'number')   ctx.spxChangePct = m.spxChangePct;
  if (typeof m?.goldChangePct === 'number')  ctx.goldChangePct = m.goldChangePct;
  if (typeof m?.oilChangePct === 'number')   ctx.oilChangePct = m.oilChangePct;
  if (typeof m?.yieldCurve === 'number')     ctx.yieldCurve = m.yieldCurve;
  if (typeof m?.macroRiskScore === 'number') ctx.macroRiskScore = m.macroRiskScore;

  // ── Volatility ──
  if (typeof vx?.value === 'number') ctx.vix = vx.value;
  else if (typeof vx === 'number')   ctx.vix = vx;

  // ── On-chain ──
  if (typeof o?.ethGasGwei === 'number')        ctx.ethGasGwei = o.ethGasGwei;
  if (typeof o?.stablePct24h === 'number')      ctx.stablePct24h = o.stablePct24h;
  if (typeof o?.btcMempoolPending === 'number') ctx.btcMempoolPending = o.btcMempoolPending;

  // ── Microstructure ──
  if (typeof fnd?.value === 'number') ctx.fundingRatePct = fnd.value;
  else if (typeof fnd === 'number')   ctx.fundingRatePct = fnd;
  if (typeof op?.longShortRatio === 'number') ctx.longShortRatio = op.longShortRatio;

  return ctx;
}

/**
 * Builds a debug snapshot of the live context — same data, with metadata
 * on which factor sources fired and which didn't.
 */
export async function debugLiveContext(symbol: string): Promise<{ context: RenaissanceContext; populated: string[]; missing: string[] }> {
  const ctx = await buildLiveContext(symbol);
  const populated = Object.entries(ctx).filter(([, val]) => val !== undefined).map(([k]) => k);
  const allFields = [
    'fearGreedValue','vix','fundingRatePct','longShortRatio','redditAttention','searchTrend',
    'dxyChangePct','spxChangePct','goldChangePct','oilChangePct','yieldCurve','macroRiskScore',
    'gdeltToneIndex','politicalRiskIndex','weatherStressIndex','weatherCommodityScore',
    'ethGasGwei','stablePct24h','btcMempoolPending',
  ];
  const missing = allFields.filter((f) => populated.indexOf(f) === -1);
  return { context: ctx, populated, missing };
}
