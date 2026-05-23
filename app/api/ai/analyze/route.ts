import { NextRequest, NextResponse } from 'next/server';
import { groqReadChart, groqAnalyze } from '@/src/services/groq-ai';
import { supabaseAdmin } from '@/src/services/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { symbol, timeframe, language = 'id', mode = 'chart' } = body;

  if (!process.env.GROQ_API_KEY || process.env.FEATURE_AI_ENABLED !== 'true') {
    return NextResponse.json({ error: 'AI disabled', analysis: 'AI analysis not configured.' }, { status: 503 });
  }

  const { data: candles } = await supabaseAdmin
    .from('market_ohlcv')
    .select('open,high,low,close,volume,open_time')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: false })
    .limit(20);

  if (!candles || candles.length < 5) {
    return NextResponse.json({ error: 'Insufficient data' }, { status: 400 });
  }

  if (mode === 'chart') {
    const analysis = await groqReadChart(candles.reverse(), symbol, timeframe, language);
    return NextResponse.json({ symbol, timeframe, analysis, mode: 'chart' });
  }

  return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
}
