/**
 * Macro feeds aggregator — DXY, US10Y/2Y, yield curve, gold, oil, BTC/ETH dominance.
 * Uses Yahoo Finance public chart API (no key required).
 */

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooQuote {
  symbol: string;
  price: number;
  changePercent: number;
  timestamp: number;
}

async function yahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 AtlasQuant/2.0' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.chart?.result?.[0];
    const meta = r?.meta;
    if (!meta) return null;
    const last = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? last;
    const cp = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    return {
      symbol,
      price: typeof last === 'number' ? last : 0,
      changePercent: parseFloat(cp.toFixed(3)),
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export interface MacroFeedsSnapshot {
  dxy: YahooQuote | null;
  vix: YahooQuote | null;
  move: YahooQuote | null;
  us10y: YahooQuote | null;
  us2y: YahooQuote | null;
  yieldCurve: number | null;
  gold: YahooQuote | null;
  silver: YahooQuote | null;
  oilWTI: YahooQuote | null;
  oilBrent: YahooQuote | null;
  natGas: YahooQuote | null;
  copper: YahooQuote | null;
  spx: YahooQuote | null;
  nasdaq: YahooQuote | null;
  hangSeng: YahooQuote | null;
  nikkei: YahooQuote | null;
  ftse: YahooQuote | null;
  dax: YahooQuote | null;
  btcDominance: number | null;
  ethDominance: number | null;
  totalMarketCap: number | null;
  // Synthesised
  macroRiskScore: number;     // 0-100 (50 = neutral)
  notes: string[];
  timestamp: number;
}

async function getCoinGeckoGlobal(): Promise<{ btc?: number; eth?: number; total?: number } | null> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      btc: data?.data?.market_cap_percentage?.btc ?? undefined,
      eth: data?.data?.market_cap_percentage?.eth ?? undefined,
      total: data?.data?.total_market_cap?.usd ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getMacroFeeds(): Promise<MacroFeedsSnapshot> {
  const [
    dxy, vix, move, us10y, us2y,
    gold, silver, oilWTI, oilBrent, natGas, copper,
    spx, nasdaq, hangSeng, nikkei, ftse, dax,
    gecko,
  ] = await Promise.all([
    yahooQuote('DX-Y.NYB'),
    yahooQuote('^VIX'),
    yahooQuote('^MOVE'),
    yahooQuote('^TNX'),
    yahooQuote('^IRX'),
    yahooQuote('GC=F'),
    yahooQuote('SI=F'),
    yahooQuote('CL=F'),
    yahooQuote('BZ=F'),
    yahooQuote('NG=F'),
    yahooQuote('HG=F'),
    yahooQuote('^GSPC'),
    yahooQuote('^IXIC'),
    yahooQuote('^HSI'),
    yahooQuote('^N225'),
    yahooQuote('^FTSE'),
    yahooQuote('^GDAXI'),
    getCoinGeckoGlobal(),
  ]);

  const yieldCurve = us10y && us2y ? parseFloat((us10y.price - us2y.price).toFixed(3)) : null;

  // Risk score: high VIX + inverted curve + DXY surge + falling SPX ⇒ risk-off (<50)
  let risk = 50;
  const notes: string[] = [];
  if (vix?.price) {
    if (vix.price > 35) { risk -= 18; notes.push(`VIX ${vix.price.toFixed(1)}: extreme fear`); }
    else if (vix.price > 25) { risk -= 8; notes.push(`VIX ${vix.price.toFixed(1)}: elevated fear`); }
    else if (vix.price < 14) { risk += 6; notes.push(`VIX ${vix.price.toFixed(1)}: low volatility`); }
  }
  if (yieldCurve != null) {
    if (yieldCurve < 0) { risk -= 10; notes.push(`Curve inverted (${yieldCurve}bps)`); }
  }
  if (dxy?.changePercent != null && Math.abs(dxy.changePercent) > 0.5) {
    risk += dxy.changePercent > 0 ? -4 : 4;
    notes.push(`DXY ${dxy.changePercent > 0 ? '+' : ''}${dxy.changePercent}%`);
  }
  if (spx?.changePercent != null) {
    risk += spx.changePercent * 1.5;
    if (Math.abs(spx.changePercent) > 1.0) notes.push(`SPX ${spx.changePercent > 0 ? '+' : ''}${spx.changePercent.toFixed(2)}%`);
  }
  if (gold?.changePercent != null && gold.changePercent > 1.5) {
    risk -= 3;
    notes.push(`Gold +${gold.changePercent.toFixed(2)}%: safe-haven bid`);
  }
  if (move?.price && move.price > 130) {
    risk -= 5;
    notes.push(`MOVE ${move.price.toFixed(1)}: bond-vol stress`);
  }
  risk = Math.max(0, Math.min(100, Math.round(risk)));

  return {
    dxy, vix, move, us10y, us2y,
    yieldCurve,
    gold, silver, oilWTI, oilBrent, natGas, copper,
    spx, nasdaq, hangSeng, nikkei, ftse, dax,
    btcDominance: gecko?.btc ?? null,
    ethDominance: gecko?.eth ?? null,
    totalMarketCap: gecko?.total ?? null,
    macroRiskScore: risk,
    notes,
    timestamp: Date.now(),
  };
}

export function scoreMacroFeeds(s: MacroFeedsSnapshot | null): { multiplier: number; note: string } {
  if (!s) return { multiplier: 1.0, note: '' };
  // Risk-off mode → reduce position size
  if (s.macroRiskScore < 25) return { multiplier: 0.78, note: `Macro risk-off (${s.macroRiskScore})` };
  if (s.macroRiskScore < 40) return { multiplier: 0.90, note: `Macro caution (${s.macroRiskScore})` };
  if (s.macroRiskScore > 70) return { multiplier: 1.10, note: `Macro risk-on (${s.macroRiskScore})` };
  if (s.macroRiskScore > 60) return { multiplier: 1.04, note: `Macro positive (${s.macroRiskScore})` };
  return { multiplier: 1.0, note: '' };
}
