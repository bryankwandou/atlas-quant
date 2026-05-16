/**
 * POST /api/quant/signals — generate sinyal kuantitatif lengkap dengan
 * AI commentary, alt-data, dan persist ke Supabase.
 *
 * Body: { symbol, timeframe, language?, dryRun? }
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv } from '@/services/market/provider';
import { generateSignal } from '@/core/quant/signal-engine';
import { altFactorSnapshot } from '@/services/altdata';
import { aiSignalCommentary } from '@/services/ai/multi-provider';
import { supabaseAdmin } from '@/services/db/supabase';

export async function POST(req: Request) {
  try {
    const { symbol = 'BTCUSDT', timeframe = '15m', language = 'id', dryRun = false } = await req.json().catch(() => ({}));

    const candles = await fetchOhlcv({ symbol, timeframe, limit: 500 });

    // Alt-data factor → broadcast as constant series
    const alt = await altFactorSnapshot(symbol);
    const fill = (v: number | null) => candles.map(() => v ?? 0);
    const altData = {
      sentiment: fill(alt.cryptoNewsSentiment),
      news: fill(alt.cryptoNewsSentiment),
      weather: fill(alt.weatherAnomaly),
      calendar: fill(alt.macroSurprise),
    };

    const sig = generateSignal({ symbol, timeframe, candles, altData });

    // AI commentary
    let ai: Awaited<ReturnType<typeof aiSignalCommentary>> | null = null;
    if (process.env.FEATURE_AI_ENABLED !== 'false') {
      try {
        ai = await aiSignalCommentary({
          symbol, timeframe,
          signal: sig.type, confidence: sig.confidence, regime: sig.regime,
          factors: sig.factors.map((f) => ({ key: f.key, value: f.value, contribution: f.contribution })),
          entry: sig.entryPrice, tp1: sig.tp1, sl: sig.sl, notes: sig.notes,
          language: language === 'en' ? 'en' : 'id',
        });
      } catch (e) {
        ai = null;
      }
    }

    // Persist (best effort)
    if (!dryRun) {
      const sb = supabaseAdmin();
      if (sb) {
        await sb.from('quant_signals').insert({
          symbol, timeframe,
          signal_type: sig.type,
          strategy: 'COMPOSITE_RENAISSANCE_V1',
          strategy_family: 'rentech-blend',
          confidence: sig.confidence,
          score: sig.score,
          entry_price: sig.entryPrice,
          tp1: sig.tp1, tp2: sig.tp2, tp3: sig.tp3,
          sl: sig.sl,
          atr_value: sig.atr,
          rr_ratio: sig.rrRatio,
          regime: sig.regime,
          factors: sig.factors,
          alt_data: alt,
          ai_provider: ai?.provider,
          ai_model: ai?.model,
          ai_analysis: ai?.commentary,
          ai_score: ai?.aiScore,
          expires_at: new Date(Date.now() + ttlForTimeframe(timeframe)).toISOString(),
        }).then(undefined, () => null);
      }
    }

    return NextResponse.json({ signal: sig, ai, altSnapshot: alt });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', detail: String(e) }, { status: 500 });
  }
}

function ttlForTimeframe(tf: string): number {
  const map: Record<string, number> = {
    '1m': 5 * 60_000, '5m': 15 * 60_000, '15m': 60 * 60_000,
    '30m': 90 * 60_000, '1h': 4 * 60 * 60_000, '4h': 24 * 60 * 60_000, '1d': 7 * 24 * 60 * 60_000,
  };
  return map[tf] ?? 3_600_000;
}
