const GROQ_BASE = 'https://api.groq.com/openai/v1';

interface AnalysisInput {
  symbol: string; timeframe: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; strategy: string; regime: string;
  indicators: Record<string, number>;
  entryPrice: number; tp1: number; sl: number;
}

interface AnalysisOutput {
  commentary: string;
  score: number;
  keyRisks: string[];
  validity: 'strong' | 'moderate' | 'weak' | 'invalid';
}

export async function groqAnalyze(input: AnalysisInput): Promise<AnalysisOutput> {
  if (!process.env.GROQ_API_KEY) {
    return { commentary: 'AI analysis unavailable — no API key', score: 50, keyRisks: [], validity: 'weak' };
  }

  const prompt = `You are a quantitative trading analyst. Analyze this signal briefly and return JSON only.

Signal Data:
- Symbol: ${input.symbol} | Timeframe: ${input.timeframe}
- Signal: ${input.signal} | Strategy: ${input.strategy}
- Confidence: ${input.confidence}% | Regime: ${input.regime}
- Entry: ${input.entryPrice} | TP1: ${input.tp1} | SL: ${input.sl}
- Indicators: ${JSON.stringify(input.indicators)}

Return ONLY valid JSON:
{
  "commentary": "2-3 sentence analysis",
  "score": <number 0-100>,
  "keyRisks": ["risk1", "risk2"],
  "validity": "strong|moderate|weak|invalid"
}`;

  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) throw new Error(`Groq error: ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.choices[0]?.message?.content || '{}');
  } catch {
    return { commentary: 'AI analysis unavailable', score: 50, keyRisks: [], validity: 'weak' };
  }
}

export async function groqReadChart(
  candles: any[], symbol: string, timeframe: string, language = 'id'
): Promise<string> {
  if (!process.env.GROQ_API_KEY) return 'AI analysis unavailable.';

  const last10 = candles.slice(-10);
  const langInstr = language === 'id' ? 'Respond in Bahasa Indonesia.' : 'Respond in English.';
  const prompt = `${langInstr} You are an expert chart analyst. Analyze these last 10 candles for ${symbol} on ${timeframe} timeframe and give a concise 2-3 sentence market insight. Focus on: price action, momentum, and key levels. Data: ${JSON.stringify(last10.map((c: any) => ({ o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })))}`;

  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return 'AI analysis unavailable.';
    const data = await res.json();
    return data.choices[0]?.message?.content || 'AI analysis unavailable.';
  } catch {
    return 'AI analysis unavailable.';
  }
}
