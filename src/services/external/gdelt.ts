/**
 * GDELT 2.0 — global geopolitical / political-risk feed (free, no auth).
 * https://api.gdeltproject.org/api/v2/doc/doc?...
 *
 * Strategy: query the recent global news index, count articles by tone & theme,
 * synthesise a 0-100 political-risk index and -100..+100 tone score.
 *
 * GDELT is rate-limited but tolerant — we cache aggressively.
 */

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';

const THEMES_HIGH_RISK = [
  'TERROR', 'WAR', 'SANCTION', 'ASSASSINATION', 'COUP',
  'NATIONAL_ELECTION', 'PROTEST', 'CRISIS', 'NUCLEAR',
];

export interface GDELTArticle {
  url: string;
  title: string;
  tone: number;
  domain: string;
  themes: string[];
  language: string;
}

export interface GDELTPulse {
  articles: number;
  averageTone: number;        // -10 .. +10 raw GDELT
  highRiskMentions: number;   // articles touching high-risk themes
  politicalRiskIndex: number; // 0-100
  toneIndex: number;          // -100 .. +100
  notes: string[];
  timestamp: number;
}

export async function getGDELTPulse(query = 'sourcecountry:US OR theme:ECON_STOCKMARKET'): Promise<GDELTPulse | null> {
  try {
    const url = `${GDELT_BASE}?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=75&sort=DateDesc`;
    const res = await fetch(url, { next: { revalidate: 1200 } });
    if (!res.ok) return null;
    const data = await res.json();
    const articles = (data?.articles ?? []) as any[];
    if (!articles.length) return null;

    let toneSum = 0;
    let highRiskCount = 0;
    const themesSeen: Record<string, number> = {};
    for (const a of articles) {
      const tone = parseFloat(a?.tone ?? '0');
      if (!Number.isNaN(tone)) toneSum += tone;
      const themes: string[] = (a?.themes ?? a?.allnames ?? '').toString().split(';').filter(Boolean);
      for (const t of themes) {
        themesSeen[t] = (themesSeen[t] ?? 0) + 1;
        if (THEMES_HIGH_RISK.some((k) => t.includes(k))) highRiskCount++;
      }
    }

    const averageTone = toneSum / articles.length;
    const toneIndex = Math.max(-100, Math.min(100, Math.round(averageTone * 10)));
    const politicalRiskIndex = Math.min(100, Math.round((highRiskCount / Math.max(1, articles.length)) * 220 + Math.max(0, -averageTone) * 5));

    const topThemes = Object.entries(themesSeen)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const notes: string[] = [];
    if (politicalRiskIndex > 60) notes.push(`High political-risk pulse (idx=${politicalRiskIndex}). Top themes: ${topThemes.slice(0,3).join(', ')}`);
    if (averageTone < -3) notes.push(`Negative news tone (${averageTone.toFixed(1)}) — risk-off bias`);
    if (averageTone > 3) notes.push(`Positive news tone (${averageTone.toFixed(1)}) — risk-on bias`);

    return {
      articles: articles.length,
      averageTone: parseFloat(averageTone.toFixed(2)),
      highRiskMentions: highRiskCount,
      politicalRiskIndex,
      toneIndex,
      notes,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export function scoreGDELT(g: GDELTPulse | null): { multiplier: number; note: string } {
  if (!g) return { multiplier: 1.0, note: '' };
  let mult = 1.0;
  if (g.politicalRiskIndex > 70) mult *= 0.80;
  else if (g.politicalRiskIndex > 50) mult *= 0.90;
  if (g.toneIndex < -30) mult *= 0.92;
  if (g.toneIndex > 30)  mult *= 1.05;
  return {
    multiplier: parseFloat(mult.toFixed(3)),
    note: g.politicalRiskIndex > 50 ? `GDELT political-risk=${g.politicalRiskIndex}, tone=${g.toneIndex}` : '',
  };
}
