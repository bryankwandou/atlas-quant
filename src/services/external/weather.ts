/**
 * Open-Meteo (no-auth) weather aggregator. Used as a macro factor for
 * commodity-sensitive assets — e.g. NG/HO heating demand, agriculture (corn,
 * wheat, soybeans), and energy load curves.
 *
 * Regions sampled:
 *   USA — Iowa (corn), Kansas (wheat), Texas (energy), NYC (consumption)
 *   ROW — São Paulo (soy/sugar), London (gas), Tokyo (LNG)
 */

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

const REGIONS = [
  { id: 'iowa',     lat: 41.59, lon: -93.62, weight: 0.18, tags: ['corn','soy','agriculture'] },
  { id: 'kansas',   lat: 39.05, lon: -95.69, weight: 0.12, tags: ['wheat','agriculture'] },
  { id: 'texas',    lat: 32.78, lon: -96.80, weight: 0.18, tags: ['energy','natgas','oil'] },
  { id: 'sao_paulo',lat: -23.55, lon: -46.63, weight: 0.12, tags: ['soy','sugar','coffee'] },
  { id: 'nyc',      lat: 40.71, lon: -74.00, weight: 0.10, tags: ['consumption','energy'] },
  { id: 'london',   lat: 51.51, lon: -0.13,  weight: 0.10, tags: ['gas','energy'] },
  { id: 'tokyo',    lat: 35.68, lon: 139.69, weight: 0.10, tags: ['lng','energy'] },
  { id: 'mumbai',   lat: 19.07, lon: 72.87,  weight: 0.10, tags: ['monsoon','agriculture'] },
];

export interface WeatherSample {
  region: string;
  temperatureC: number;
  precipitationMm: number;
  windKmh: number;
  tags: string[];
  anomalyZ: number;     // simple z-score vs 7-day mean
}

export interface WeatherMacro {
  samples: WeatherSample[];
  /** -100 ... +100 bearish (favorable) ... bullish (disruptive) commodity factor */
  commodityImpactScore: number;
  /** Direction-neutral 0–100 stress score */
  weatherStressIndex: number;
  notes: string[];
  timestamp: number;
}

async function fetchRegion(lat: number, lon: number, id: string, tags: string[], weight: number): Promise<WeatherSample | null> {
  try {
    const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&past_days=7&forecast_days=1&timezone=UTC`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const t: number[] = data?.hourly?.temperature_2m ?? [];
    const p: number[] = data?.hourly?.precipitation ?? [];
    const w: number[] = data?.hourly?.wind_speed_10m ?? [];
    if (!t.length) return null;
    const last24 = t.slice(-24);
    const tCurr = last24[last24.length - 1] ?? 0;
    const mean7d = t.length ? t.reduce((a, b) => a + b, 0) / t.length : tCurr;
    const std = Math.sqrt(t.reduce((a, b) => a + (b - mean7d) ** 2, 0) / Math.max(1, t.length));
    const z = std > 0 ? (tCurr - mean7d) / std : 0;
    return {
      region: id,
      temperatureC: tCurr,
      precipitationMm: p.slice(-24).reduce((a, b) => a + b, 0),
      windKmh: w.slice(-24).reduce((a, b) => a + b, 0) / Math.max(1, w.slice(-24).length),
      tags,
      anomalyZ: parseFloat(z.toFixed(2)),
    };
  } catch {
    return null;
  }
}

export async function getWeatherMacro(): Promise<WeatherMacro | null> {
  try {
    const results = await Promise.allSettled(REGIONS.map((r) => fetchRegion(r.lat, r.lon, r.id, r.tags, r.weight)));
    const samples = results
      .map((r, i) => (r.status === 'fulfilled' ? (r.value ? { ...r.value, _w: REGIONS[i].weight } as any : null) : null))
      .filter(Boolean) as Array<WeatherSample & { _w: number }>;
    if (samples.length === 0) return null;

    // Stress: average absolute anomaly + precipitation z
    const stress = samples.reduce((acc, s) => acc + (Math.abs(s.anomalyZ) * 30 + Math.min(s.precipitationMm / 50, 1) * 20) * s._w, 0);
    const weatherStressIndex = Math.min(100, Math.round(stress));

    // Directional impact: heat + drought ⇒ bullish energy & agri; cold + wet ⇒ varied
    let commodity = 0;
    for (const s of samples) {
      if (s.tags.includes('energy') || s.tags.includes('natgas')) {
        commodity += s.anomalyZ * 8 * s._w; // hot/cold both can be bullish — keep linear
      }
      if (s.tags.includes('agriculture') || s.tags.includes('corn') || s.tags.includes('soy') || s.tags.includes('wheat')) {
        // drought (high temp anomaly + low precip) ⇒ bullish
        commodity += Math.max(0, s.anomalyZ - (s.precipitationMm > 25 ? 1 : 0)) * 6 * s._w;
      }
    }
    const commodityImpactScore = Math.max(-100, Math.min(100, Math.round(commodity * 10)));

    const notes: string[] = [];
    const hotZones = samples.filter((s) => s.anomalyZ > 1.5).map((s) => s.region);
    const coldZones = samples.filter((s) => s.anomalyZ < -1.5).map((s) => s.region);
    const wetZones = samples.filter((s) => s.precipitationMm > 30).map((s) => s.region);
    if (hotZones.length) notes.push(`Heat anomaly: ${hotZones.join(', ')}`);
    if (coldZones.length) notes.push(`Cold anomaly: ${coldZones.join(', ')}`);
    if (wetZones.length) notes.push(`Heavy precipitation: ${wetZones.join(', ')}`);

    return {
      samples: samples.map(({ _w, ...rest }) => rest),
      commodityImpactScore,
      weatherStressIndex,
      notes,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export function scoreWeatherMacro(w: WeatherMacro | null): { multiplier: number; note: string } {
  if (!w) return { multiplier: 1.0, note: '' };
  const mult = w.weatherStressIndex > 60 ? 0.92 : 1.0;
  return {
    multiplier: mult,
    note: w.weatherStressIndex > 60 ? `Weather stress=${w.weatherStressIndex} — commodity volatility likely` : '',
  };
}
