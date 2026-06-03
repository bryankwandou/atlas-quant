/**
 * ATLAS-QUANT · Quant Signals API (v2 — Macro-Enhanced)
 *
 * GET  /api/quant/signals?symbol=BTCUSDT&timeframe=15m
 *      Returns latest saved signals or generates a fresh one if none exist.
 *
 * POST /api/quant/signals
 *      Body: { symbol, timeframe, save?, strategies? }
 *      Generates a macro-enhanced signal and optionally persists it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateMacroEnhancedSignal } from '@/src/core/quant/macro-signal';
import { getAllMacroData } from '@/src/services/macroData';
import { routeOHLCV } from '@/src/lib/marketRouter';
import { supabaseAdmin } from '@/src/services/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch latest signals from DB, or generate fresh
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = (searchParams.get('symbol') ?? 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('timeframe') ?? '15m';
  const limit     = parseInt(searchParams.get('limit') ?? '20', 10);
  const fresh     = searchParams.get('fresh') === 'true';

  try {
    // If fresh=true or no DB available, generate directly
    if (fresh) {
      return await generateAndReturn(symbol, timeframe, false);
    }

    // Try DB first
    let query = supabaseAdmin
      .from('quant_signals')
      .select('*')
      .eq('is_active', true)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (symbol)    query = query.eq('symbol', symbol);
    if (timeframe) query = query.eq('timeframe', timeframe);

    const { data: dbSignals, error } = await query;

    if (!error && dbSignals && dbSignals.length > 0) {
      return NextResponse.json({ signals: dbSignals, source: 'db' });
    }

    // No DB signals — generate fresh
    return await generateAndReturn(symbol, timeframe, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signal fetch failed';
    // Last resort: try generating
    try {
      return await generateAndReturn(symbol, timeframe, false);
    } catch {
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — generate macro-enhanced signal, optionally save
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      symbol    = 'BTCUSDT',
      timeframe = '15m',
      save      = false,
      userPubkey,
    } = body as {
      symbol?: string;
      timeframe?: string;
      save?: boolean;
      userPubkey?: string;
    };

    return await generateAndReturn(symbol.toUpperCase(), timeframe, save, userPubkey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signal generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared generation helper
// ─────────────────────────────────────────────────────────────────────────────

async function generateAndReturn(
  symbol: string,
  timeframe: string,
  shouldSave: boolean,
  userPubkey?: string,
): Promise<Response> {
  // Fetch candles and macro data in parallel.
  // Macro aggregates 6 slow external sources — cap it at 8s and fall back to a
  // neutral macro so signal EXECUTION never hangs/times out.
  const [candles, macroData] = await Promise.all([
    routeOHLCV(symbol, timeframe, 200),
    macroWithTimeout(8000),
  ]);

  if (!candles || candles.length < 50) {
    return NextResponse.json(
      { error: `Insufficient candle data for ${symbol} ${timeframe} (got ${candles?.length ?? 0})` },
      { status: 400 },
    );
  }

  const closes  = candles.map(c => c.close);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const signal = await generateMacroEnhancedSignal(
    closes, highs, lows, volumes, symbol, macroData,
  );

  // Persist to DB if requested
  let savedId: string | null = null;
  if (shouldSave) {
    try {
      const { data: saved } = await supabaseAdmin
        .from('quant_signals')
        .insert({
          symbol,
          timeframe,
          signal_type:  signal.finalSignal,
          strategy:     'MacroEnhanced_v2',
          confidence:   signal.confidence,
          accuracy:     signal.accuracy,
          entry_price:  signal.entryPrice,
          tp1:          signal.tp1,
          tp2:          signal.tp2,
          tp3:          signal.tp3,
          sl:           signal.sl,
          rr_ratio:     signal.rrRatio,
          regime:       signal.regime,
          adx:          signal.adx,
          rsi:          signal.rsi,
          trend:        signal.trend,
          macro_score:  signal.macroScore,
          macro_bias:   signal.macroSignal,
          risk_flags:   signal.riskFlags,
          indicators: {
            technical_score: signal.technicalScore,
            macro_factors:   signal.macroFactors,
          },
          is_active:    true,
          generated_at: new Date().toISOString(),
          expires_at:   new Date(Date.now() + getSignalTTL(timeframe)).toISOString(),
          user_id:      userPubkey ?? null,
        })
        .select('id')
        .single();
      savedId = saved?.id ?? null;
    } catch {
      // Persist is optional; continue without it
    }
  }

  return NextResponse.json({
    signal,
    symbol,
    timeframe,
    savedId,
    source: 'generated',
    macro: {
      score:     macroData.macroScore,
      bias:      macroData.marketBias,
      riskLevel: macroData.riskLevel,
      fearGreed: macroData.fearGreed,
      geopolitical: {
        score: macroData.geopolitical.score,
        trend: macroData.geopolitical.trend,
      },
    },
  });
}

// Neutral macro fallback (mirrors getAllMacroData's per-source defaults) so a
// slow external source can never stall signal execution.
const NEUTRAL_MACRO: any = {
  fearGreed: { value: 50, label: 'Neutral', timestamp: Date.now() },
  macro: { fedFundsRate: 5.33, yieldCurve10y2y: -0.2, unemploymentRate: 4.1, cpi: 3.5, dollarIndex: 104.5 },
  weather: { temperature: 20, windspeed: 10, weathercode: 0, riskScore: 5 },
  geopolitical: { score: 30, events: [], trend: 'stable' },
  calendar: { events: [], hasHighImpactToday: false },
  centralBank: [],
  macroScore: 50, marketBias: 'NEUTRAL', riskLevel: 'MEDIUM', ts: Date.now(),
};

function macroWithTimeout(ms: number): Promise<any> {
  return Promise.race([
    getAllMacroData().catch(() => NEUTRAL_MACRO),
    new Promise((res) => setTimeout(() => res(NEUTRAL_MACRO), ms)),
  ]);
}

function getSignalTTL(tf: string): number {
  const map: Record<string, number> = {
    '1m':  5  * 60 * 1000,
    '5m':  15 * 60 * 1000,
    '15m': 60 * 60 * 1000,
    '1h':  4  * 60 * 60 * 1000,
    '4h':  24 * 60 * 60 * 1000,
    '1d':  7  * 24 * 60 * 60 * 1000,
  };
  return map[tf] ?? 3_600_000;
}
