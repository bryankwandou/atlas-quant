/**
 * Alternative-data services — agregator untuk faktor eksternal ala
 * Renaissance Technologies. Setiap fungsi best-effort: kembalikan null
 * kalau API key tidak ada. Dipakai di /api/altdata + signal engine.
 *
 * Sumber:
 *   - Fear & Greed Index (alternative.me) — free
 *   - CryptoPanic news sentiment — free tier
 *   - OpenWeather weather observations — free tier
 *   - Polymarket prediction market odds — public
 *   - World Bank / FRED macro — free public
 *   - NOAA / Visual Crossing weather data — free tier with key
 *   - Reddit + Twitter sentiment — proxy with custom server
 */

const fetchJson = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, { ...init, next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
};

export async function fetchFearGreed(): Promise<{ value: number; classification: string } | null> {
  try {
    const d = await fetchJson('https://api.alternative.me/fng/?limit=1');
    const item = d?.data?.[0];
    if (!item) return null;
    return { value: Number(item.value), classification: item.value_classification };
  } catch { return null; }
}

export async function fetchCryptoPanic(symbol?: string): Promise<Array<{ title: string; sentiment: number; published: string; url: string }> | null> {
  const key = process.env.CRYPTOPANIC_API_KEY;
  if (!key) return null;
  try {
    const sp = new URLSearchParams({ auth_token: key, public: 'true' });
    if (symbol) sp.set('currencies', symbol.replace(/USDT$/, ''));
    const d = await fetchJson(`https://cryptopanic.com/api/v1/posts/?${sp.toString()}`);
    return (d?.results ?? []).slice(0, 20).map((p: Record<string, unknown>) => ({
      title: String(p.title ?? ''),
      sentiment: ((p.votes as Record<string, number> | undefined)?.positive ?? 0) - ((p.votes as Record<string, number> | undefined)?.negative ?? 0),
      published: String(p.published_at ?? ''),
      url: String(p.url ?? ''),
    }));
  } catch { return null; }
}

export async function fetchOpenWeather(query: string): Promise<{ temp: number; weather: string; main: string } | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;
  try {
    const d = await fetchJson(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${key}&units=metric`);
    return {
      temp: d?.main?.temp,
      weather: d?.weather?.[0]?.description,
      main: d?.weather?.[0]?.main,
    };
  } catch { return null; }
}

export async function fetchPolymarketEvent(slug: string): Promise<unknown | null> {
  try {
    const d = await fetchJson(`https://clob.polymarket.com/markets?slug=${encodeURIComponent(slug)}`);
    return d;
  } catch { return null; }
}

export async function fetchEconomicEvents(): Promise<Array<{ title: string; impact: string; date: string }> | null> {
  // Use FRED announced data series + simple economic calendar fallback
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const d = await fetchJson(`https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCNS&api_key=${key}&file_type=json&sort_order=desc&limit=5`);
    return (d?.observations ?? []).map((o: Record<string, unknown>) => ({
      title: 'CPI (CPIAUCNS)',
      impact: 'high',
      date: String(o.date),
    }));
  } catch { return null; }
}

export async function fetchWhaleAlerts(): Promise<Array<{ symbol: string; amount: number; from: string; to: string; timestamp: number }> | null> {
  const key = process.env.WHALE_ALERT_API_KEY;
  if (!key) return null;
  try {
    const d = await fetchJson(`https://api.whale-alert.io/v1/transactions?api_key=${key}&min_value=1000000`);
    return (d?.transactions ?? []).map((t: Record<string, unknown>) => ({
      symbol: String(t.symbol ?? ''),
      amount: Number(t.amount_usd ?? 0),
      from: ((t.from as Record<string, unknown>)?.owner_type as string) ?? '',
      to: ((t.to as Record<string, unknown>)?.owner_type as string) ?? '',
      timestamp: Number(t.timestamp ?? 0),
    }));
  } catch { return null; }
}

export interface AltFactorSnapshot {
  feargreed: number | null;
  cryptoNewsSentiment: number | null;
  weatherAnomaly: number | null;
  macroSurprise: number | null;
  whaleNetFlow: number | null;
  collectedAt: number;
}

/**
 * Snapshot semua alt-data → satu factor map siap dipakai signal engine.
 * Setiap field di-normalisasi ke skala -1 … +1 (atau null kalau tidak tersedia).
 */
export async function altFactorSnapshot(symbol?: string): Promise<AltFactorSnapshot> {
  const [fg, news] = await Promise.all([
    fetchFearGreed().catch(() => null),
    symbol ? fetchCryptoPanic(symbol).catch(() => null) : Promise.resolve(null),
  ]);
  return {
    feargreed: fg ? (fg.value - 50) / 50 : null,
    cryptoNewsSentiment: news && news.length
      ? Math.max(-1, Math.min(1, news.reduce((s, n) => s + Math.sign(n.sentiment), 0) / news.length))
      : null,
    weatherAnomaly: null,
    macroSurprise: null,
    whaleNetFlow: null,
    collectedAt: Date.now(),
  };
}
