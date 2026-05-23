// VIX (CBOE Volatility Index) via Yahoo Finance — free, no auth
// Also fetches DXY (US Dollar Index) and Gold/Oil as macro regime indicators

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function fetchYahooLatest(ticker: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 AtlasQuant/2.0' },
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice || meta.previousClose || 0;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    return { price, change24h: prev ? ((price - prev) / prev) * 100 : 0 };
  } catch { return null; }
}

export interface MacroIndicators {
  vix: number | null;       // Fear gauge (>30 = high fear)
  dxy: number | null;       // Dollar strength
  gold: number | null;      // Safe haven demand
  oil: number | null;       // Economic growth proxy
  tenYear: number | null;   // US 10Y yield
  timestamp: number;
  regime: 'risk_on' | 'risk_off' | 'neutral';
  regimeScore: number;      // -100 (extreme risk-off) to +100 (extreme risk-on)
}

export async function getMacroIndicators(): Promise<MacroIndicators> {
  const [vixData, dxyData, goldData, oilData, bondData] = await Promise.allSettled([
    fetchYahooLatest('^VIX'),
    fetchYahooLatest('DX-Y.NYB'),
    fetchYahooLatest('GC=F'),
    fetchYahooLatest('CL=F'),
    fetchYahooLatest('^TNX'),
  ]);

  const vix = vixData.status === 'fulfilled' ? vixData.value?.price ?? null : null;
  const dxy = dxyData.status === 'fulfilled' ? dxyData.value?.price ?? null : null;
  const gold = goldData.status === 'fulfilled' ? goldData.value?.price ?? null : null;
  const oil = oilData.status === 'fulfilled' ? oilData.value?.price ?? null : null;
  const tenYear = bondData.status === 'fulfilled' ? bondData.value?.price ?? null : null;

  // Regime score: positive = risk-on, negative = risk-off
  let score = 0;
  if (vix !== null) {
    if (vix < 15) score += 20;
    else if (vix < 20) score += 10;
    else if (vix > 30) score -= 25;
    else if (vix > 25) score -= 15;
  }
  if (dxyData.status === 'fulfilled' && dxyData.value) {
    // Rising DXY = risk-off (bad for risk assets)
    score += dxyData.value.change24h > 0.5 ? -15 : dxyData.value.change24h < -0.5 ? 15 : 0;
  }
  if (goldData.status === 'fulfilled' && goldData.value) {
    // Rising gold = risk-off or inflation hedge
    score += goldData.value.change24h > 1 ? -10 : 0;
  }
  if (oilData.status === 'fulfilled' && oilData.value) {
    // Rising oil = growth (mild risk-on) or stagflation risk
    score += oilData.value.change24h > 2 ? 5 : oilData.value.change24h < -2 ? -10 : 0;
  }
  if (tenYear !== null) {
    // High yields = risk-off for equities/crypto
    if (tenYear > 5) score -= 20;
    else if (tenYear > 4.5) score -= 10;
    else if (tenYear < 3) score += 10;
  }

  const regime: MacroIndicators['regime'] = score >= 15 ? 'risk_on' : score <= -15 ? 'risk_off' : 'neutral';

  return { vix, dxy, gold, oil, tenYear, timestamp: Date.now(), regime, regimeScore: Math.max(-100, Math.min(100, score)) };
}

export function scoreMacroRegime(macro: MacroIndicators): { multiplier: number; note: string } {
  if (macro.regime === 'risk_on')  return { multiplier: 1.08, note: `Risk-on macro (VIX ${macro.vix?.toFixed(1)})` };
  if (macro.regime === 'risk_off') return { multiplier: 0.80, note: `Risk-off macro (VIX ${macro.vix?.toFixed(1)})` };
  return { multiplier: 1.0, note: 'Neutral macro regime' };
}
