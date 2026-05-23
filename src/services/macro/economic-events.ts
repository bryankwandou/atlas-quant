// Economic calendar via open APIs (no auth)
// Primary: Forex Factory JSON scrape (public data)
// Secondary: Investing.com public API pattern
// Tertiary: Static important event detection from news

export interface EconomicEvent {
  id: string;
  date: string;         // ISO 8601
  time: string;
  currency: string;     // e.g. 'USD', 'EUR', 'JPY'
  event: string;        // e.g. 'CPI m/m'
  impact: 'low' | 'medium' | 'high';
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  surprise: 'beat' | 'miss' | 'inline' | null;
}

export interface EventCalendarData {
  events: EconomicEvent[];
  upcomingHigh: EconomicEvent[];  // next 24h high-impact
  recentHigh: EconomicEvent[];    // last 24h high-impact with results
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
}

// Fetch from TradingEconomics public JSON (free tier)
async function fetchTradingEconomics(): Promise<EconomicEvent[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    // TradingEconomics free endpoint (limited but functional)
    const url = `https://api.tradingeconomics.com/calendar/country/all/${today}/${tomorrow}?c=guest:guest&f=json`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json() as any[];
    return data.slice(0, 50).map((e: any): EconomicEvent => ({
      id: e.CalendarId || String(Math.random()),
      date: e.Date?.slice(0, 10) || today,
      time: e.Date?.slice(11, 16) || '00:00',
      currency: e.Currency || 'USD',
      event: e.Event || '',
      impact: e.Importance === 3 ? 'high' : e.Importance === 2 ? 'medium' : 'low',
      actual: e.Actual ?? null,
      forecast: e.Forecast ?? null,
      previous: e.Previous ?? null,
      surprise: e.Actual != null && e.Forecast != null
        ? (parseFloat(e.Actual) > parseFloat(e.Forecast) ? 'beat'
          : parseFloat(e.Actual) < parseFloat(e.Forecast) ? 'miss' : 'inline')
        : null,
    }));
  } catch { return []; }
}

// Fallback: known important recurring events (always available, no fetch)
function getKnownHighImpactWindows(): string[] {
  const d = new Date();
  const hour = d.getUTCHours();
  const min = d.getUTCMinutes();
  const weekday = d.getUTCDay(); // 0=Sun, 5=Fri

  const warnings: string[] = [];

  // US Market Open / Close
  if (hour === 13 && min >= 25 && min <= 35) warnings.push('US MARKET OPEN (13:30 UTC) — high volatility expected');
  if (hour === 19 && min >= 55 && min <= 65 % 60) warnings.push('US MARKET CLOSE (20:00 UTC) — elevated volatility');

  // FOMC meetings tend to be Wed 14:00 ET (19:00 UTC), 8 times/year
  // NFP: First Friday of month at 08:30 ET (13:30 UTC)
  if (weekday === 5 && hour === 13 && min >= 15) warnings.push('Possible NFP Friday — high USD volatility window');

  // Asian session open
  if (hour === 0 && min < 30) warnings.push('Asian session open — JPY/AUD pairs active');

  // London open
  if (hour === 7 && min >= 50) warnings.push('London session open — EUR/GBP volatility');

  return warnings;
}

export async function getEconomicCalendar(): Promise<EventCalendarData> {
  const events = await fetchTradingEconomics();
  const now = Date.now();
  const in24h = now + 86400000;

  const highImpact = events.filter(e => e.impact === 'high');
  const upcoming = highImpact.filter(e => {
    const t = new Date(e.date + 'T' + (e.time || '00:00') + ':00Z').getTime();
    return t > now && t < in24h;
  });
  const recent = highImpact.filter(e => {
    const t = new Date(e.date + 'T' + (e.time || '00:00') + ':00Z').getTime();
    return t < now && t > now - 86400000 && e.actual != null;
  });

  const windows = getKnownHighImpactWindows();
  const riskLevel = upcoming.length >= 2 ? 'high'
    : upcoming.length >= 1 || windows.length > 0 ? 'medium' : 'low';

  return {
    events,
    upcomingHigh: upcoming,
    recentHigh: recent,
    riskLevel,
    timestamp: now,
  };
}

export function scoreEventRisk(calendar: EventCalendarData): { multiplier: number; note: string } {
  if (calendar.riskLevel === 'high')   return { multiplier: 0.75, note: 'High-impact event window: reduce position size' };
  if (calendar.riskLevel === 'medium') return { multiplier: 0.90, note: 'Event risk present: elevated caution' };
  return { multiplier: 1.0, note: 'No major events in window' };
}
