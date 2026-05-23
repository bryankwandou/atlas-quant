export * from './fear-greed';
export * from './funding-rates';
export * from './vix';
export * from './central-bank';
export * from './economic-events';
export * from './open-interest';

import { getFearGreedIndex, scoreFearGreed } from './fear-greed';
import { getFundingRate, scoreFundingRate } from './funding-rates';
import { getMacroIndicators, scoreMacroRegime } from './vix';
import { getCentralBankData, scoreCentralBank } from './central-bank';
import { getEconomicCalendar, scoreEventRisk } from './economic-events';
import { getOpenInterest, scoreOpenInterest } from './open-interest';

export interface AggregatedMacro {
  fearGreed: Awaited<ReturnType<typeof getFearGreedIndex>> | null;
  macro: Awaited<ReturnType<typeof getMacroIndicators>> | null;
  centralBank: Awaited<ReturnType<typeof getCentralBankData>> | null;
  eventCalendar: Awaited<ReturnType<typeof getEconomicCalendar>> | null;
  fundingRate: Awaited<ReturnType<typeof getFundingRate>> | null;
  openInterest: Awaited<ReturnType<typeof getOpenInterest>> | null;

  // Composite macro score: 0-100 (50 = neutral)
  compositeScore: number;
  macroRegime: 'strongly_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strongly_bearish';
  tradingRecommendation: string;
  confidenceMultiplier: number;
  notes: string[];
  timestamp: number;
}

export async function getAggregatedMacro(symbol?: string): Promise<AggregatedMacro> {
  const [fngR, macroR, cbR, calR, fundR, oiR] = await Promise.allSettled([
    getFearGreedIndex(),
    getMacroIndicators(),
    getCentralBankData(),
    getEconomicCalendar(),
    symbol ? getFundingRate(symbol) : Promise.resolve(null),
    symbol ? getOpenInterest(symbol) : Promise.resolve(null),
  ]);

  const fng = fngR.status === 'fulfilled' ? fngR.value : null;
  const macro = macroR.status === 'fulfilled' ? macroR.value : null;
  const cb = cbR.status === 'fulfilled' ? cbR.value : null;
  const cal = calR.status === 'fulfilled' ? calR.value : null;
  const funding = fundR.status === 'fulfilled' ? fundR.value : null;
  const oi = oiR.status === 'fulfilled' ? oiR.value : null;

  // Gather multipliers
  const scores = [
    fng ? scoreFearGreed(fng) : { multiplier: 1.0, note: '' },
    macro ? scoreMacroRegime(macro) : { multiplier: 1.0, note: '' },
    cb ? scoreCentralBank(cb) : { multiplier: 1.0, note: '' },
    cal ? scoreEventRisk(cal) : { multiplier: 1.0, note: '' },
    scoreFundingRate(funding),
    scoreOpenInterest(oi),
  ];

  const notes = scores.map(s => s.note).filter(Boolean);
  const compositeMultiplier = scores.reduce((acc, s) => acc * s.multiplier, 1);

  // Composite score 0-100 (50 = neutral)
  const compositeScore = Math.round(Math.min(100, Math.max(0, 50 * compositeMultiplier)));

  let macroRegime: AggregatedMacro['macroRegime'];
  let tradingRecommendation: string;
  let confidenceMultiplier: number;

  if (compositeScore >= 70) {
    macroRegime = 'strongly_bullish';
    tradingRecommendation = 'Macro strongly supports long positions. High confidence zone.';
    confidenceMultiplier = compositeMultiplier;
  } else if (compositeScore >= 58) {
    macroRegime = 'bullish';
    tradingRecommendation = 'Macro favors longs. Normal position sizing.';
    confidenceMultiplier = compositeMultiplier;
  } else if (compositeScore >= 42) {
    macroRegime = 'neutral';
    tradingRecommendation = 'Macro neutral. Use technical signals as primary driver.';
    confidenceMultiplier = 1.0;
  } else if (compositeScore >= 30) {
    macroRegime = 'bearish';
    tradingRecommendation = 'Macro headwinds. Reduce long exposure, tighten stops.';
    confidenceMultiplier = compositeMultiplier;
  } else {
    macroRegime = 'strongly_bearish';
    tradingRecommendation = 'Strong macro headwinds. Consider staying flat or short only.';
    confidenceMultiplier = compositeMultiplier;
  }

  return {
    fearGreed: fng,
    macro,
    centralBank: cb,
    eventCalendar: cal,
    fundingRate: funding,
    openInterest: oi,
    compositeScore,
    macroRegime,
    tradingRecommendation,
    confidenceMultiplier,
    notes,
    timestamp: Date.now(),
  };
}
