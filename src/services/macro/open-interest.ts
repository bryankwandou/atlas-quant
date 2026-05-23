// Binance Open Interest + Long/Short Ratio — public, no auth
const FAPI = process.env.BINANCE_FAPI_URL || 'https://fapi.binance.com';

export interface OpenInterestData {
  symbol: string;
  openInterestUSD: number;
  longShortRatio: number | null;  // >1 = more longs
  longPct: number | null;
  shortPct: number | null;
  oiChangePercent: number | null;  // OI change vs 5m ago
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export async function getOpenInterest(symbol: string): Promise<OpenInterestData | null> {
  try {
    const pair = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const [oiRes, lsRes] = await Promise.allSettled([
      fetch(`${FAPI}/fapi/v1/openInterest?symbol=${pair}`, { next: { revalidate: 300 } }),
      fetch(`${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${pair}&period=5m&limit=1`, { next: { revalidate: 300 } }),
    ]);

    let oiUSD = 0;
    if (oiRes.status === 'fulfilled' && oiRes.value.ok) {
      const d = await oiRes.value.json();
      oiUSD = parseFloat(d.openInterest || '0');
    }

    let longShortRatio: number | null = null;
    let longPct: number | null = null;
    let shortPct: number | null = null;
    if (lsRes.status === 'fulfilled' && lsRes.value.ok) {
      const arr = await lsRes.value.json() as any[];
      if (arr?.length) {
        longShortRatio = parseFloat(arr[0].longShortRatio || '1');
        longPct = parseFloat(arr[0].longAccount || '0.5') * 100;
        shortPct = 100 - longPct;
      }
    }

    const sentiment: OpenInterestData['sentiment'] =
      longShortRatio !== null
        ? (longShortRatio > 1.2 ? 'bullish' : longShortRatio < 0.8 ? 'bearish' : 'neutral')
        : 'neutral';

    return { symbol: pair, openInterestUSD: oiUSD, longShortRatio, longPct, shortPct, oiChangePercent: null, sentiment };
  } catch { return null; }
}

export function scoreOpenInterest(oi: OpenInterestData | null): { multiplier: number; note: string } {
  if (!oi || oi.longShortRatio === null) return { multiplier: 1.0, note: 'No OI data' };
  const ratio = oi.longShortRatio;
  // Contrarian: overcrowded longs = short squeeze risk = sell signal; overcrowded shorts = short squeeze = buy signal
  if (ratio > 1.8) return { multiplier: 0.85, note: `Overcrowded longs (L/S ${ratio.toFixed(2)}): squeeze risk` };
  if (ratio > 1.3) return { multiplier: 0.95, note: `Long-heavy positioning: mild caution` };
  if (ratio < 0.5) return { multiplier: 0.85, note: `Overcrowded shorts (L/S ${ratio.toFixed(2)}): squeeze risk` };
  if (ratio < 0.8) return { multiplier: 0.95, note: `Short-heavy positioning: mild caution` };
  return { multiplier: 1.05, note: `Balanced positioning (L/S ${ratio.toFixed(2)})` };
}
