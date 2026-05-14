import { NextRequest, NextResponse } from 'next/server';
import { generateSignal } from '@/src/core/quant/signal-engine';
import { supabaseAdmin, saveSignal } from '@/src/services/supabase';
import { groqAnalyze } from '@/src/services/groq-ai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { symbol, timeframe, strategies, userPubkey } = body;

  const { data: rawCandles } = await supabaseAdmin
    .from('market_ohlcv')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: true })
    .limit(500);

  if (!rawCandles || rawCandles.length < 50) {
    return NextResponse.json({ error: 'Insufficient data' }, { status: 400 });
  }

  const candles = rawCandles.map((c: any) => ({
    time: c.open_time, open: c.open, high: c.high, low: c.low,
    close: c.close, volume: c.volume,
  }));

  const signal = generateSignal(candles, strategies);

  let aiAnalysis = null;
  let aiScore = null;

  if (signal.type !== 'NEUTRAL' && process.env.FEATURE_AI_ENABLED === 'true') {
    try {
      const analysis = await groqAnalyze({
        symbol, timeframe,
        signal: signal.type as any,
        confidence: signal.confidence,
        strategy: signal.strategy,
        regime: signal.regime,
        indicators: signal.indicators,
        entryPrice: signal.entryPrice,
        tp1: signal.tp1, sl: signal.sl,
      });
      aiAnalysis = analysis.commentary;
      aiScore = analysis.score;
    } catch {
      // AI analysis optional
    }
  }

  let savedSignalId: string | null = null;
  try {
    const saved = await saveSignal({
      symbol, timeframe,
      signal_type: signal.type,
      strategy: signal.strategy,
      confidence: signal.confidence,
      entry_price: signal.entryPrice,
      tp1: signal.tp1, tp2: signal.tp2, tp3: signal.tp3,
      sl: signal.sl,
      atr_value: signal.atrValue,
      rr_ratio: signal.rrRatio,
      indicators: signal.indicators,
      ai_analysis: aiAnalysis,
      ai_score: aiScore,
      regime: signal.regime,
      expires_at: new Date(Date.now() + getSignalTTL(timeframe)).toISOString(),
      user_id: userPubkey,
    });
    savedSignalId = saved?.id || null;
  } catch {
    // save optional
  }

  return NextResponse.json({ signal, aiAnalysis, aiScore, signalId: savedSignalId });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const limit  = parseInt(searchParams.get('limit') || '20');

  try {
    let query = supabaseAdmin
      .from('quant_signals')
      .select('*')
      .eq('is_active', true)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (symbol) query = query.eq('symbol', symbol);
    const { data } = await query;
    return NextResponse.json({ signals: data || [] });
  } catch {
    return NextResponse.json({ signals: [] });
  }
}

function getSignalTTL(tf: string): number {
  const map: Record<string, number> = {
    '1m': 5 * 60 * 1000, '5m': 15 * 60 * 1000, '15m': 60 * 60 * 1000,
    '1h': 4 * 60 * 60 * 1000, '4h': 24 * 60 * 60 * 1000, '1d': 7 * 24 * 60 * 60 * 1000,
  };
  return map[tf] || 3600000;
}
