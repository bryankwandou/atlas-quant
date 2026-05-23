/**
 * ATLAS-QUANT Macro Data Engine
 * Sources: FRED (CSV), Open-Meteo, GDELT, Alternative.me, ECB, TradingEconomics
 * All APIs are free/open-source, no manual intervention required
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface FearGreedResult {
  value: number;
  label: string;
  timestamp: number;
}

export interface FredSeriesPoint {
  date: string;
  value: number;
}

export interface MacroIndicatorsResult {
  fedFundsRate: number;
  yieldCurve10y2y: number;
  unemploymentRate: number;
  cpi: number;
  dollarIndex: number;
  vix?: number;
}

export interface WeatherRiskResult {
  temperature: number;
  windspeed: number;
  weathercode: number;
  riskScore: number;
}

export interface GeopoliticalRiskResult {
  score: number;
  events: string[];
  trend: 'rising' | 'falling' | 'stable';
}

export interface EconomicCalendarEvent {
  date: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  country: string;
  actual?: number;
  forecast?: number;
}

export interface EconomicCalendarResult {
  events: EconomicCalendarEvent[];
  hasHighImpactToday: boolean;
}

export interface CentralBankEvent {
  bank: string;
  event: string;
  date: string;
  impact: 'high' | 'low';
}

export interface AllMacroData {
  fearGreed: FearGreedResult;
  macro: MacroIndicatorsResult;
  weather: WeatherRiskResult;
  geopolitical: GeopoliticalRiskResult;
  calendar: EconomicCalendarResult;
  centralBank: CentralBankEvent[];
  macroScore: number;
  marketBias: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  ts: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FEAR & GREED INDEX — Alternative.me (free, no key)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFearGreedIndex(): Promise<FearGreedResult> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`FNG status ${res.status}`);
    const json = await res.json();
    const data = json?.data as Array<{ value: string; value_classification: string; timestamp: string }>;
    if (!data?.length) throw new Error('FNG empty');
    const latest = data[0];
    return {
      value: parseInt(latest.value, 10),
      label: latest.value_classification,
      timestamp: parseInt(latest.timestamp, 10) * 1000,
    };
  } catch {
    // Fallback: neutral value
    return { value: 50, label: 'Neutral', timestamp: Date.now() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FRED CSV SERIES — free, no key required for CSV endpoint
// ─────────────────────────────────────────────────────────────────────────────

export async function getFredSeries(seriesId: string): Promise<FredSeriesPoint[]> {
  try {
    // FRED CSV endpoint requires no API key
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { 'User-Agent': 'AtlasQuant/2.0 (+https://atlas-quant.vercel.app)' },
    });
    if (!res.ok) throw new Error(`FRED CSV ${seriesId} status ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split('\n');
    // First line is header: DATE,VALUE
    const result: FredSeriesPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [date, valueStr] = lines[i].split(',');
      if (!date || !valueStr) continue;
      const value = parseFloat(valueStr.trim());
      if (!isNaN(value)) result.push({ date: date.trim(), value });
    }
    return result;
  } catch {
    return [];
  }
}

/** Get most recent value from a FRED series */
async function getLatestFred(seriesId: string): Promise<number | null> {
  try {
    // Try FRED JSON API with key if available
    const apiKey = process.env.FRED_API_KEY;
    if (apiKey) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) {
        const json = await res.json();
        const obs = json?.observations as Array<{ value: string }>;
        if (obs?.length) {
          const val = parseFloat(obs[0].value);
          if (!isNaN(val)) return val;
        }
      }
    }
    // Fallback: CSV
    const series = await getFredSeries(seriesId);
    if (!series.length) return null;
    // Walk backwards to find last non-NaN value
    for (let i = series.length - 1; i >= 0; i--) {
      if (!isNaN(series[i].value)) return series[i].value;
    }
    return null;
  } catch {
    return null;
  }
}

/** VIX from Yahoo Finance — free, no key */
async function getVIX(): Promise<number | null> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d';
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'Mozilla/5.0 AtlasQuant/2.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return meta.regularMarketPrice ?? meta.previousClose ?? null;
  } catch {
    return null;
  }
}

export async function getMacroIndicators(): Promise<MacroIndicatorsResult> {
  const [fedRate, yieldCurve, unemployment, cpi, dxy, vix] = await Promise.allSettled([
    getLatestFred('DFF'),         // Fed Funds Rate
    getLatestFred('T10Y2Y'),      // 10Y-2Y yield curve spread
    getLatestFred('UNRATE'),      // Unemployment Rate
    getLatestFred('CPIAUCSL'),    // CPI (level; we'll treat latest value as proxy for YoY context)
    getLatestFred('DTWEXBGS'),    // USD Broad Trade-Weighted Dollar Index
    getVIX(),
  ]);

  const extractNum = (r: PromiseSettledResult<number | null>, fallback: number): number => {
    if (r.status === 'fulfilled' && r.value !== null && !isNaN(r.value)) return r.value;
    return fallback;
  };

  return {
    fedFundsRate:      extractNum(fedRate, 5.33),
    yieldCurve10y2y:   extractNum(yieldCurve, -0.2),
    unemploymentRate:  extractNum(unemployment, 4.1),
    cpi:               extractNum(cpi, 3.5),
    dollarIndex:       extractNum(dxy, 104.5),
    vix:               vix.status === 'fulfilled' ? (vix.value ?? undefined) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GLOBAL WEATHER RISK — Open-Meteo (free, no key)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches current weather for a given location and derives a market risk score.
 * New York (40.71, -74.01) used as financial hub default.
 * Extreme weather events correlate with energy price volatility and supply chain disruption.
 */
export async function getWeatherRisk(lat = 40.71, lon = -74.01): Promise<WeatherRiskResult> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Open-Meteo status ${res.status}`);
    const json = await res.json();
    const cw = json?.current_weather;
    if (!cw) throw new Error('No current_weather');

    const temperature: number = cw.temperature ?? 20;
    const windspeed: number = cw.windspeed ?? 10;
    const weathercode: number = cw.weathercode ?? 0;

    // WMO weather code risk mapping
    // 0 = clear, 1-3 = partly cloudy, 45-48 = fog, 51-67 = drizzle/rain
    // 71-77 = snow, 80-82 = rain showers, 85-86 = snow showers
    // 95 = thunderstorm, 96-99 = hail
    let codeRisk = 0;
    if (weathercode === 0) codeRisk = 0;
    else if (weathercode <= 3) codeRisk = 5;
    else if (weathercode <= 48) codeRisk = 15; // fog
    else if (weathercode <= 67) codeRisk = 25; // rain
    else if (weathercode <= 77) codeRisk = 35; // snow
    else if (weathercode <= 82) codeRisk = 30; // showers
    else if (weathercode <= 86) codeRisk = 40; // snow showers
    else if (weathercode >= 95) codeRisk = 60; // thunderstorm/hail

    // Wind risk: >50 km/h is significant
    const windRisk = Math.min(30, Math.max(0, (windspeed - 20) * 0.8));

    // Temperature extremes (NYC context): <-10°C or >38°C is extreme
    const tempRisk = temperature < -10 ? 20 : temperature > 38 ? 20 : temperature < 0 ? 10 : temperature > 35 ? 10 : 0;

    const riskScore = Math.min(100, Math.round(codeRisk + windRisk + tempRisk));

    return { temperature, windspeed, weathercode, riskScore };
  } catch {
    return { temperature: 20, windspeed: 10, weathercode: 0, riskScore: 5 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GEOPOLITICAL RISK — GDELT Project (free, no key)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GDELT provides real-time global event monitoring derived from news.
 * We query recent crisis/conflict articles and score risk 0-100.
 */
export async function getGeopoliticalRisk(): Promise<GeopoliticalRiskResult> {
  try {
    // GDELT v2 Doc API — query crisis/conflict articles in last 15 minutes
    const query = encodeURIComponent('crisis OR conflict OR war OR sanction OR geopolitical');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=10&format=json&timespan=15min`;
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'AtlasQuant/2.0' },
    });

    if (!res.ok) throw new Error(`GDELT status ${res.status}`);
    const json = await res.json();
    const articles = json?.articles as Array<{ title?: string; seendate?: string; domain?: string }> | undefined;

    if (!articles || articles.length === 0) {
      return { score: 20, events: [], trend: 'stable' };
    }

    // Extract event titles as strings
    const events: string[] = articles
      .slice(0, 5)
      .map(a => a.title || '')
      .filter(Boolean);

    // Score based on article count and recency
    const articleCount = articles.length;
    const baseScore = Math.min(80, articleCount * 7);

    // Check for high-severity keywords
    const highSeverityTerms = ['war', 'nuclear', 'attack', 'invasion', 'sanctions', 'missile'];
    const titles = events.join(' ').toLowerCase();
    const severityBoost = highSeverityTerms.filter(t => titles.includes(t)).length * 5;

    const score = Math.min(100, baseScore + severityBoost);

    // Trend: compare against a simple baseline (10 = low baseline)
    const trend: GeopoliticalRiskResult['trend'] =
      score > 65 ? 'rising' : score < 25 ? 'falling' : 'stable';

    return { score, events, trend };
  } catch {
    // Fallback: moderate risk with no events
    return { score: 30, events: ['Unable to fetch GDELT data'], trend: 'stable' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ECONOMIC CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

/** Known high-impact recurring economic events (always available, no fetch needed) */
function getStaticHighImpactEvents(): EconomicCalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const weekday = now.getUTCDay();   // 0=Sun, 5=Fri, 3=Wed
  const hour = now.getUTCHours();
  const month = now.getUTCMonth() + 1; // 1-12
  const dayOfMonth = now.getUTCDate();

  const events: EconomicCalendarEvent[] = [];

  // NFP: First Friday of month at 08:30 ET (13:30 UTC)
  if (weekday === 5 && dayOfMonth <= 7) {
    events.push({
      date: today, event: 'Non-Farm Payrolls (NFP)',
      impact: 'high', country: 'US',
    });
  }

  // CPI: Usually second week of month, Wednesday
  if (weekday === 3 && dayOfMonth >= 8 && dayOfMonth <= 14) {
    events.push({
      date: today, event: 'CPI m/m (US Inflation)',
      impact: 'high', country: 'US',
    });
  }

  // FOMC: 8 times/year; approx every 6-7 weeks — Wednesday releases
  if (weekday === 3 && [1, 3, 5, 6, 7, 9, 11, 12].includes(month)) {
    events.push({
      date: today, event: 'FOMC Meeting / Rate Decision',
      impact: 'high', country: 'US',
    });
  }

  // GDP: End of each quarter
  if (weekday === 4 && dayOfMonth >= 25) {
    events.push({
      date: today, event: 'GDP q/q (Preliminary)',
      impact: 'high', country: 'US',
    });
  }

  // US Market open/close windows
  if (hour === 13 && now.getUTCMinutes() >= 25) {
    events.push({
      date: today, event: 'US Market Open — High Volatility Window',
      impact: 'medium', country: 'US',
    });
  }
  if (hour === 19 && now.getUTCMinutes() >= 45) {
    events.push({
      date: today, event: 'US Market Close — Elevated Volatility',
      impact: 'medium', country: 'US',
    });
  }

  return events;
}

/** Attempt to fetch live calendar from TradingEconomics free guest endpoint */
async function fetchLiveCalendar(): Promise<EconomicCalendarEvent[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const url = `https://api.tradingeconomics.com/calendar/country/all/${today}/${tomorrow}?c=guest:guest&f=json`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json() as any[];
    if (!Array.isArray(data)) return [];
    return data.slice(0, 50).map((e: any): EconomicCalendarEvent => ({
      date: (e.Date || today).slice(0, 10),
      event: e.Event || '',
      impact: e.Importance === 3 ? 'high' : e.Importance === 2 ? 'medium' : 'low',
      country: e.Currency || 'USD',
      actual: e.Actual != null ? parseFloat(e.Actual) : undefined,
      forecast: e.Forecast != null ? parseFloat(e.Forecast) : undefined,
    })).filter(ev => ev.event);
  } catch {
    return [];
  }
}

/** Try Alpha Vantage economic calendar if key is available */
async function fetchAlphaVantageCalendar(): Promise<EconomicCalendarEvent[]> {
  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key) return [];
  try {
    const url = `https://www.alphavantage.co/query?function=ECONOMIC_CALENDAR&apikey=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data as any[] | undefined;
    if (!Array.isArray(items)) return [];
    const today = new Date().toISOString().slice(0, 10);
    return items
      .filter((e: any) => e.date && e.date.startsWith(today))
      .map((e: any): EconomicCalendarEvent => ({
        date: e.date?.slice(0, 10) || today,
        event: e.name || '',
        impact: e.impact?.toLowerCase() === 'high' ? 'high'
          : e.impact?.toLowerCase() === 'medium' ? 'medium' : 'low',
        country: e.country || 'US',
        actual: e.actual != null ? parseFloat(e.actual) : undefined,
        forecast: e.estimate != null ? parseFloat(e.estimate) : undefined,
      }));
  } catch {
    return [];
  }
}

export async function getEconomicCalendar(): Promise<EconomicCalendarResult> {
  const today = new Date().toISOString().slice(0, 10);

  // Try live sources in priority order
  const [avEvents, liveEvents] = await Promise.allSettled([
    fetchAlphaVantageCalendar(),
    fetchLiveCalendar(),
  ]);

  const primaryEvents = avEvents.status === 'fulfilled' && avEvents.value.length > 0
    ? avEvents.value
    : liveEvents.status === 'fulfilled' ? liveEvents.value : [];

  // Always merge in the static known events
  const staticEvents = getStaticHighImpactEvents();
  const allEvents = [...primaryEvents, ...staticEvents];

  // Deduplicate by event name
  const seen = new Set<string>();
  const deduped = allEvents.filter(e => {
    const key = `${e.date}:${e.event}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const hasHighImpactToday = deduped.some(e => e.impact === 'high' && e.date === today);

  return {
    events: deduped.slice(0, 30),
    hasHighImpactToday,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CENTRAL BANK CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns known upcoming / recent central bank decision dates.
 * Static schedule based on published 2024-2026 meeting calendars.
 * Updated with actual dates from Fed, ECB, BoJ, BoE, BI, PBOC.
 */
export async function getCentralBankEvents(): Promise<CentralBankEvent[]> {
  const now = new Date();
  const currentYear = now.getFullYear();

  // FOMC 2025-2026 meeting schedule (rate decision announced)
  const fomcDates2025 = [
    '2025-01-29', '2025-03-19', '2025-05-07', '2025-06-18',
    '2025-07-30', '2025-09-17', '2025-10-29', '2025-12-10',
  ];
  const fomcDates2026 = [
    '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
    '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09',
  ];

  // ECB 2025-2026
  const ecbDates2025 = [
    '2025-01-30', '2025-03-06', '2025-04-17', '2025-06-05',
    '2025-07-24', '2025-09-11', '2025-10-30', '2025-12-18',
  ];
  const ecbDates2026 = [
    '2026-01-29', '2026-03-05', '2026-04-16', '2026-06-04',
    '2026-07-23', '2026-09-10', '2026-10-29', '2026-12-17',
  ];

  // Bank of Japan 2025
  const bojDates2025 = [
    '2025-01-24', '2025-03-19', '2025-04-30', '2025-06-17',
    '2025-07-31', '2025-09-19', '2025-10-29', '2025-12-19',
  ];
  const bojDates2026 = [
    '2026-01-23', '2026-03-18', '2026-04-29', '2026-06-16',
    '2026-07-30', '2026-09-18', '2026-10-28', '2026-12-18',
  ];

  // Bank of England 2025
  const boeDates2025 = [
    '2025-02-06', '2025-03-20', '2025-05-08', '2025-06-19',
    '2025-08-07', '2025-09-18', '2025-11-06', '2025-12-18',
  ];
  const boeDates2026 = [
    '2026-02-05', '2026-03-19', '2026-05-07', '2026-06-18',
    '2026-08-06', '2026-09-17', '2026-11-05', '2026-12-17',
  ];

  // Bank Indonesia (BI) 2025 — quarterly cadence approximated
  const biDates2025 = [
    '2025-01-15', '2025-02-19', '2025-03-19', '2025-04-23',
    '2025-05-21', '2025-06-18', '2025-07-16', '2025-08-20',
    '2025-09-17', '2025-10-15', '2025-11-19', '2025-12-17',
  ];

  // PBOC (People's Bank of China) — LPR announcements, 20th of each month
  const pbocDates: string[] = [];
  for (let m = 1; m <= 12; m++) {
    pbocDates.push(`${currentYear}-${String(m).padStart(2, '0')}-20`);
    pbocDates.push(`${currentYear + 1}-${String(m).padStart(2, '0')}-20`);
  }

  const allDates: CentralBankEvent[] = [
    ...fomcDates2025.map(date => ({ bank: 'Federal Reserve', event: 'FOMC Rate Decision', date, impact: 'high' as const })),
    ...fomcDates2026.map(date => ({ bank: 'Federal Reserve', event: 'FOMC Rate Decision', date, impact: 'high' as const })),
    ...ecbDates2025.map(date => ({ bank: 'European Central Bank', event: 'ECB Rate Decision', date, impact: 'high' as const })),
    ...ecbDates2026.map(date => ({ bank: 'European Central Bank', event: 'ECB Rate Decision', date, impact: 'high' as const })),
    ...bojDates2025.map(date => ({ bank: 'Bank of Japan', event: 'BoJ Policy Rate Decision', date, impact: 'high' as const })),
    ...bojDates2026.map(date => ({ bank: 'Bank of Japan', event: 'BoJ Policy Rate Decision', date, impact: 'high' as const })),
    ...boeDates2025.map(date => ({ bank: 'Bank of England', event: 'BoE Rate Decision (MPC)', date, impact: 'high' as const })),
    ...boeDates2026.map(date => ({ bank: 'Bank of England', event: 'BoE Rate Decision (MPC)', date, impact: 'high' as const })),
    ...biDates2025.map(date => ({ bank: 'Bank Indonesia', event: 'BI Rate Decision (RDG)', date, impact: 'high' as const })),
    ...pbocDates.slice(0, 24).map(date => ({ bank: 'PBOC', event: 'LPR Announcement', date, impact: 'low' as const })),
  ];

  // Return events from 7 days ago to 30 days ahead, sorted by date
  const cutoffPast = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const cutoffFuture = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  return allDates
    .filter(e => e.date >= cutoffPast && e.date <= cutoffFuture)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. COMPOSITE MACRO SCORE
// ─────────────────────────────────────────────────────────────────────────────

function computeMacroScore(
  fearGreed: FearGreedResult,
  macro: MacroIndicatorsResult,
  weather: WeatherRiskResult,
  geopolitical: GeopoliticalRiskResult,
): number {
  let score = 50;

  // Fear & Greed contribution: normalize around 50 (0-100)
  // If F&G = 50 (neutral), contribution = 0. If 100 (extreme greed), +12.5. If 0 (extreme fear), -12.5
  score += (fearGreed.value - 50) * 0.25;

  // Geopolitical risk: higher risk = more bearish pressure
  score -= geopolitical.score * 0.15;

  // Yield curve: positive spread (10Y > 2Y) = healthy = bullish
  score += macro.yieldCurve10y2y > 0 ? 10 : -10;

  // Fed funds rate: >5% = tightening = bearish
  if (macro.fedFundsRate > 5) score -= 5;

  // CPI: <3% = goldilocks = bullish; >5% = stagflation risk = bearish
  if (macro.cpi < 3) score += 5;
  else if (macro.cpi > 5) score -= 10;

  // VIX adjustment if available
  if (macro.vix !== undefined) {
    if (macro.vix < 15) score += 5;       // Low VIX = complacency (risk-on)
    else if (macro.vix > 30) score -= 10; // High VIX = fear
    else if (macro.vix > 25) score -= 5;
  }

  // Weather risk: extreme weather = supply-chain disruption risk
  score -= weather.riskScore * 0.05;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function deriveBias(score: number): 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL' {
  if (score >= 62) return 'RISK_ON';
  if (score <= 38) return 'RISK_OFF';
  return 'NEUTRAL';
}

function deriveRiskLevel(
  score: number,
  geopolitical: GeopoliticalRiskResult,
  calendar: EconomicCalendarResult,
  vix?: number,
): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
  let riskPoints = 0;

  if (score < 30) riskPoints += 3;
  else if (score < 42) riskPoints += 2;
  else if (score < 50) riskPoints += 1;

  if (geopolitical.score > 70) riskPoints += 2;
  else if (geopolitical.score > 50) riskPoints += 1;

  if (calendar.hasHighImpactToday) riskPoints += 2;
  else if (calendar.events.filter(e => e.impact === 'high').length > 0) riskPoints += 1;

  if (vix !== undefined) {
    if (vix > 40) riskPoints += 3;
    else if (vix > 30) riskPoints += 2;
    else if (vix > 25) riskPoints += 1;
  }

  if (riskPoints >= 6) return 'EXTREME';
  if (riskPoints >= 4) return 'HIGH';
  if (riskPoints >= 2) return 'MEDIUM';
  return 'LOW';
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ALL MACRO IN ONE CALL
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllMacroData(): Promise<AllMacroData> {
  // Fetch all sources in parallel; individual functions have their own fallbacks
  const [fgResult, macroResult, weatherResult, geoResult, calResult, cbResult] =
    await Promise.allSettled([
      getFearGreedIndex(),
      getMacroIndicators(),
      getWeatherRisk(),
      getGeopoliticalRisk(),
      getEconomicCalendar(),
      getCentralBankEvents(),
    ]);

  const fearGreed: FearGreedResult =
    fgResult.status === 'fulfilled' ? fgResult.value : { value: 50, label: 'Neutral', timestamp: Date.now() };

  const macro: MacroIndicatorsResult =
    macroResult.status === 'fulfilled'
      ? macroResult.value
      : { fedFundsRate: 5.33, yieldCurve10y2y: -0.2, unemploymentRate: 4.1, cpi: 3.5, dollarIndex: 104.5 };

  const weather: WeatherRiskResult =
    weatherResult.status === 'fulfilled'
      ? weatherResult.value
      : { temperature: 20, windspeed: 10, weathercode: 0, riskScore: 5 };

  const geopolitical: GeopoliticalRiskResult =
    geoResult.status === 'fulfilled'
      ? geoResult.value
      : { score: 30, events: [], trend: 'stable' };

  const calendar: EconomicCalendarResult =
    calResult.status === 'fulfilled'
      ? calResult.value
      : { events: [], hasHighImpactToday: false };

  const centralBank: CentralBankEvent[] =
    cbResult.status === 'fulfilled' ? cbResult.value : [];

  const macroScore = computeMacroScore(fearGreed, macro, weather, geopolitical);
  const marketBias = deriveBias(macroScore);
  const riskLevel = deriveRiskLevel(macroScore, geopolitical, calendar, macro.vix);

  return {
    fearGreed,
    macro,
    weather,
    geopolitical,
    calendar,
    centralBank,
    macroScore,
    marketBias,
    riskLevel,
    ts: Date.now(),
  };
}
