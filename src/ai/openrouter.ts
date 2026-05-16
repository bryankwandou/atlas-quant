/**
 * OpenRouter integration — gives access to open-source models like
 *   - deepseek/deepseek-chat
 *   - deepseek/deepseek-r1
 *   - meta-llama/llama-3.3-70b-instruct
 *   - qwen/qwen-2.5-72b-instruct
 *
 * If OPENROUTER_API_KEY is missing we fall back to a deterministic
 * local explanation derived from the logistic ensemble result.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AICommentaryInput {
  symbol: string;
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  factors: string[];
  layerScores: Record<string, number>;
  ensembleVotes?: Array<{ name: string; signal: string; confidence: number }>;
}

export interface AICommentaryResult {
  model: string;
  source: 'openrouter' | 'local';
  commentary: string;
  bullets: string[];
  riskNote: string;
  raw?: any;
}

const SYSTEM = `You are Atlas Quant's quantitative analyst. You write
concise, professional trade commentary in plain English, in the spirit of
Renaissance Technologies and the T1MO scientific scoring system. You speak
in numbers, not adjectives. You never invent facts; you only summarise the
ensemble scores and factor notes you were given. Maximum 3 short paragraphs.`;

function fallbackCommentary(input: AICommentaryInput): AICommentaryResult {
  const sign = input.signal === 'BUY' ? '↑' : input.signal === 'SELL' ? '↓' : '↔';
  const top = Object.entries(input.layerScores)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v >= 0 ? '+' : ''}${v.toFixed(1)}`)
    .join(' · ');

  return {
    model: 'local-fallback',
    source: 'local',
    commentary: `${input.symbol} ${input.timeframe} prints a ${input.signal} ${sign} at ${input.confidence}% confidence. Dominant factors: ${top}. ${input.factors.slice(0, 2).join(' ')}`,
    bullets: input.factors.slice(0, 5),
    riskNote: input.signal === 'NEUTRAL'
      ? 'No edge detected. Stand aside or wait for re-test.'
      : `Stops should respect 1×ATR. Size position per Kelly fraction.`,
  };
}

export async function getAICommentary(input: AICommentaryInput, modelHint?: string): Promise<AICommentaryResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallbackCommentary(input);

  const model = modelHint ?? process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';

  const userPrompt = `Symbol: ${input.symbol} · TF: ${input.timeframe}\n` +
    `Engine signal: ${input.signal} · confidence ${input.confidence}\n` +
    `Price: ${input.price}\n` +
    `Layer scores: ${JSON.stringify(input.layerScores)}\n` +
    `Factor notes:\n${input.factors.map((f) => '  - ' + f).join('\n')}\n` +
    (input.ensembleVotes ? `Votes: ${input.ensembleVotes.map((v) => `${v.name}=${v.signal}(${v.confidence})`).join(', ')}\n` : '') +
    `\nWrite 2-3 short paragraphs of trade commentary, then 3-5 bullet points (key drivers), then 1 sentence on risk.`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://atlas-quant.vercel.app',
        'X-Title': 'Atlas Quant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return fallbackCommentary(input);
    const data = await res.json();
    const text = (data?.choices?.[0]?.message?.content ?? '').trim();
    if (!text) return fallbackCommentary(input);

    // Crude split into paragraphs / bullets / risk
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const bullets = lines.filter((l: string) => /^[-•*]/.test(l)).map((l: string) => l.replace(/^[-•*]\s*/, ''));
    const riskLine = lines.find((l: string) => /risk|stop|drawdown|var|expectancy/i.test(l)) ?? lines[lines.length - 1] ?? '';
    const paragraph = lines.filter((l: string) => !/^[-•*]/.test(l) && l !== riskLine).join(' ');

    return {
      model,
      source: 'openrouter',
      commentary: paragraph || text,
      bullets: bullets.length ? bullets : input.factors.slice(0, 5),
      riskNote: riskLine || 'Mind position sizing per Kelly fraction; respect 1×ATR stop.',
      raw: data,
    };
  } catch {
    return fallbackCommentary(input);
  }
}
