// Binance Futures funding rates — no auth, public endpoint
const BINANCE_FAPI = process.env.BINANCE_FAPI_URL || 'https://fapi.binance.com';

export interface FundingRateData {
  symbol: string;
  fundingRate: number;   // decimal e.g. 0.0001
  fundingRatePct: number; // percentage e.g. 0.01
  nextFundingTime: number;
  openInterest?: number;
  sentiment: 'long_heavy' | 'short_heavy' | 'balanced';
}

export async function getFundingRate(symbol: string): Promise<FundingRateData | null> {
  try {
    const pair = symbol.replace(/[^A-Z0-9]/g, '');
    const res = await fetch(
      `${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${pair}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const rate = parseFloat(d.lastFundingRate || '0');
    const ratePct = rate * 100;
    return {
      symbol: pair,
      fundingRate: rate,
      fundingRatePct: ratePct,
      nextFundingTime: parseInt(d.nextFundingTime || '0'),
      sentiment: ratePct > 0.05 ? 'long_heavy' : ratePct < -0.05 ? 'short_heavy' : 'balanced',
    };
  } catch { return null; }
}

export async function getTopFundingRates(): Promise<FundingRateData[]> {
  try {
    const res = await fetch(
      `${BINANCE_FAPI}/fapi/v1/premiumIndex`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const all = await res.json() as any[];
    return all
      .filter((d: any) => d.symbol.endsWith('USDT'))
      .map((d: any) => {
        const rate = parseFloat(d.lastFundingRate || '0');
        return {
          symbol: d.symbol,
          fundingRate: rate,
          fundingRatePct: rate * 100,
          nextFundingTime: parseInt(d.nextFundingTime || '0'),
          sentiment: rate * 100 > 0.05 ? 'long_heavy' : rate * 100 < -0.05 ? 'short_heavy' : 'balanced',
        } as FundingRateData;
      })
      .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
      .slice(0, 20);
  } catch { return []; }
}

// Score funding rate for signal confidence adjustment
export function scoreFundingRate(rate: FundingRateData | null): { multiplier: number; note: string } {
  if (!rate) return { multiplier: 1.0, note: 'No funding data' };
  const pct = rate.fundingRatePct;
  if (pct > 0.1) return { multiplier: 0.85, note: 'High positive funding: longs overcrowded' };
  if (pct > 0.05) return { multiplier: 0.95, note: 'Elevated funding: mild long crowding' };
  if (pct < -0.1) return { multiplier: 0.85, note: 'Negative funding: shorts overcrowded' };
  if (pct < -0.05) return { multiplier: 0.95, note: 'Negative funding: mild short crowding' };
  return { multiplier: 1.05, note: 'Balanced funding: healthy market' };
}
