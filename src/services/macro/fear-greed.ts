// Alternative.me Fear & Greed Index — no auth, free
const FNG_URL = 'https://api.alternative.me/fng/?limit=7&format=json';

export interface FearGreedData {
  value: number;       // 0-100
  label: string;       // 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  timestamp: number;
  history: { value: number; label: string; date: string }[];
}

export async function getFearGreedIndex(): Promise<FearGreedData> {
  const res = await fetch(FNG_URL, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('FNG API failed');
  const json = await res.json();
  const data = json.data as Array<{ value: string; value_classification: string; timestamp: string }>;
  if (!data?.length) throw new Error('FNG empty response');

  const latest = data[0];
  return {
    value: parseInt(latest.value),
    label: latest.value_classification,
    timestamp: parseInt(latest.timestamp),
    history: data.slice(1).map(d => ({
      value: parseInt(d.value),
      label: d.value_classification,
      date: new Date(parseInt(d.timestamp) * 1000).toISOString().slice(0, 10),
    })),
  };
}

// Score: 0-100 → sentiment multiplier for signal confidence
// Extreme Fear = bearish sentiment (contrarian: watch for BUY at oversold)
// Extreme Greed = bullish herd (caution: watch for SELL at overbought)
export function scoreFearGreed(fng: FearGreedData): { multiplier: number; note: string } {
  const v = fng.value;
  if (v <= 20) return { multiplier: 1.15, note: 'Extreme Fear: contrarian long bias' };
  if (v <= 40) return { multiplier: 1.05, note: 'Fear: mild long bias' };
  if (v <= 60) return { multiplier: 1.00, note: 'Neutral: no sentiment edge' };
  if (v <= 80) return { multiplier: 0.95, note: 'Greed: mild caution' };
  return { multiplier: 0.85, note: 'Extreme Greed: high reversal risk' };
}
