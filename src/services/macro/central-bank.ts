// Central Bank rates & macro data
// FRED (Federal Reserve Economic Data) — free, requires API key in env
// ECB Data API — completely free, no auth
// Fallback to cached static values when APIs unavailable

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const ECB_BASE  = 'https://data-api.ecb.europa.eu/service/data';

export interface CentralBankData {
  fedFundsRate: number | null;    // US Federal Funds Rate
  ecbRate: number | null;         // ECB Deposit Facility Rate
  cpiUS: number | null;           // US CPI YoY%
  cpiEU: number | null;           // EU HICP YoY%
  m2US: number | null;            // US M2 Money Supply growth%
  timestamp: number;
  rateEnvironment: 'tightening' | 'easing' | 'neutral' | 'unknown';
  note: string;
}

async function fredFetch(seriesId: string, limit = 1): Promise<number | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=${limit}&sort_order=desc`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    const obs = json.observations as Array<{ value: string }>;
    if (!obs?.length) return null;
    const val = parseFloat(obs[0].value);
    return isNaN(val) ? null : val;
  } catch { return null; }
}

async function ecbFetch(dataFlow: string, key: string): Promise<number | null> {
  try {
    const url = `${ECB_BASE}/${dataFlow}/${key}?lastNObservations=1&format=jsondata`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    const series = json?.dataSets?.[0]?.series?.['0:0:0:0:0'];
    if (!series) return null;
    const obs = Object.values(series.observations as Record<string, number[]>);
    if (!obs.length) return null;
    return (obs[obs.length - 1] as number[])[0] ?? null;
  } catch { return null; }
}

export async function getCentralBankData(): Promise<CentralBankData> {
  const [fed, ecb, cpiUS, cpiEU] = await Promise.allSettled([
    fredFetch('FEDFUNDS'),
    ecbFetch('FM/B.U2.EUR.RT.MM.EURDEP.DISC.MM', 'B.U2.EUR.RT.MM.EURDEP.DISC.MM'),
    fredFetch('CPIAUCSL'),
    ecbFetch('ICP/M.U2.N.000000.4.INX', 'M.U2.N.000000.4.INX'),
  ]);

  const fedRate = fed.status === 'fulfilled' ? fed.value : null;
  const ecbRate = ecb.status === 'fulfilled' ? ecb.value : null;
  const usInflation = cpiUS.status === 'fulfilled' ? cpiUS.value : null;
  const euInflation = cpiEU.status === 'fulfilled' ? cpiEU.value : null;

  let rateEnvironment: CentralBankData['rateEnvironment'] = 'unknown';
  let note = '';

  if (fedRate !== null) {
    if (fedRate >= 5.0) { rateEnvironment = 'tightening'; note = `Fed at ${fedRate.toFixed(2)}% — restrictive.`; }
    else if (fedRate <= 1.0) { rateEnvironment = 'easing'; note = `Fed at ${fedRate.toFixed(2)}% — accommodative.`; }
    else { rateEnvironment = 'neutral'; note = `Fed at ${fedRate.toFixed(2)}% — neutral territory.`; }
  }

  return {
    fedFundsRate: fedRate,
    ecbRate: ecbRate,
    cpiUS: usInflation,
    cpiEU: euInflation,
    m2US: null,
    timestamp: Date.now(),
    rateEnvironment,
    note: note || 'Central bank data fetched.',
  };
}

export function scoreCentralBank(cb: CentralBankData): { multiplier: number; note: string } {
  if (cb.rateEnvironment === 'easing')    return { multiplier: 1.10, note: 'Easing cycle: supports risk assets' };
  if (cb.rateEnvironment === 'tightening') return { multiplier: 0.90, note: 'Tightening cycle: headwind for risk assets' };
  return { multiplier: 1.0, note: 'Neutral rate environment' };
}
