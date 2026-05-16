/**
 * Multi-provider AI client untuk Atlas Quant.
 * Provider order (env-driven via AI_PRIMARY + AI_FALLBACK):
 *   - DeepSeek  (open-source, strong logic / math / reasoning)
 *   - Groq      (Llama 3.x, super-fast inference)
 *   - Together  (Qwen / Mixtral)
 *   - OpenRouter (universal gateway)
 *
 * Semua mendukung OpenAI-compatible /chat/completions schema sehingga
 * adapter tipis cukup. Setiap provider auto-skip kalau API key kosong.
 *
 * Output utama: JSON terstruktur untuk signal commentary (parsed).
 */
export type AiProvider = 'deepseek' | 'groq' | 'together' | 'openrouter';

interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  fastModel?: string;
}

const providers: Record<AiProvider, ProviderConfig> = {
  deepseek: {
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    defaultModel: process.env.DEEPSEEK_MODEL_CHAT || 'deepseek-chat',
    fastModel: process.env.DEEPSEEK_MODEL_REASONER || 'deepseek-reasoner',
  },
  groq: {
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    defaultModel: process.env.GROQ_MODEL_PRIMARY || 'llama-3.3-70b-versatile',
    fastModel: process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant',
  },
  together: {
    baseUrl: process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1',
    apiKey: process.env.TOGETHER_AI_KEY,
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
  },
  openrouter: {
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultModel: 'deepseek/deepseek-chat',
  },
};

function order(): AiProvider[] {
  const primary = (process.env.AI_PRIMARY as AiProvider) || 'deepseek';
  const fallback = (process.env.AI_FALLBACK ?? 'groq,together,openrouter')
    .split(',').map((s) => s.trim()).filter(Boolean) as AiProvider[];
  return [primary, ...fallback.filter((p) => p !== primary)];
}

export interface ChatOptions {
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  preferFast?: boolean;
}

export interface ChatResult {
  provider: AiProvider;
  model: string;
  text: string;
  json?: unknown;
  latencyMs: number;
}

export async function aiChat(opts: ChatOptions): Promise<ChatResult> {
  const errors: string[] = [];
  for (const p of order()) {
    const cfg = providers[p];
    if (!cfg.apiKey) { errors.push(`${p}:no_key`); continue; }
    try {
      const t0 = Date.now();
      const r = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
          ...(p === 'openrouter' ? { 'HTTP-Referer': 'https://atlas-quant.vercel.app', 'X-Title': 'Atlas Quant' } : {}),
        },
        body: JSON.stringify({
          model: opts.preferFast && cfg.fastModel ? cfg.fastModel : cfg.defaultModel,
          messages: [
            ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
            { role: 'user', content: opts.prompt },
          ],
          max_tokens: opts.maxTokens ?? 400,
          temperature: opts.temperature ?? 0.2,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!r.ok) {
        errors.push(`${p}:${r.status}`);
        continue;
      }
      const data = await r.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      let parsed: unknown = undefined;
      if (opts.json) {
        try { parsed = JSON.parse(text); } catch { /* leave undefined */ }
      }
      return {
        provider: p,
        model: opts.preferFast && cfg.fastModel ? cfg.fastModel : cfg.defaultModel,
        text,
        json: parsed,
        latencyMs: Date.now() - t0,
      };
    } catch (e) {
      errors.push(`${p}:${e instanceof Error ? e.message : 'err'}`);
    }
  }
  throw new Error(`All AI providers failed: ${errors.join(', ')}`);
}

export interface SignalCommentaryInput {
  symbol: string;
  timeframe: string;
  signal: string;
  confidence: number;
  regime: string;
  factors: Array<{ key: string; value: number; contribution: number }>;
  entry: number;
  tp1: number;
  sl: number;
  notes: string[];
  language?: 'id' | 'en';
}

export async function aiSignalCommentary(input: SignalCommentaryInput): Promise<{ commentary: string; risks: string[]; validity: string; aiScore: number; provider: AiProvider; model: string }> {
  const lang = input.language ?? 'id';
  const systemInstr = lang === 'id'
    ? 'Anda adalah analis kuantitatif. Bahas hanya signal data, JANGAN saran rekomendasi finansial. Bahasa Indonesia singkat profesional.'
    : 'You are a quantitative analyst. Discuss the signal data only — never financial advice. Be terse and professional.';
  const prompt = `${lang === 'id' ? 'Analisa singkat (3 kalimat) lalu kembalikan JSON valid.' : 'Brief 3-sentence analysis then JSON.'}\n\nData:\n${JSON.stringify(input, null, 2)}\n\nJSON schema:\n{\n  "commentary": string,\n  "risks": string[],\n  "validity": "strong"|"moderate"|"weak"|"invalid",\n  "aiScore": number 0..100\n}`;

  const res = await aiChat({ system: systemInstr, prompt, json: true, maxTokens: 350, temperature: 0.15 });
  const fallback = { commentary: res.text, risks: input.notes, validity: 'moderate' as const, aiScore: Math.round(input.confidence) };
  const parsed = (res.json as Record<string, unknown> | undefined) ?? fallback;
  return {
    commentary: String((parsed as { commentary?: unknown }).commentary ?? fallback.commentary),
    risks: ((parsed as { risks?: unknown }).risks as string[] | undefined) ?? fallback.risks,
    validity: ((parsed as { validity?: unknown }).validity as string | undefined) ?? fallback.validity,
    aiScore: Number((parsed as { aiScore?: unknown }).aiScore ?? fallback.aiScore),
    provider: res.provider,
    model: res.model,
  };
}
