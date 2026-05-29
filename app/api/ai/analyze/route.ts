import { NextRequest, NextResponse } from 'next/server';
import { groqReadChart } from '@/src/services/groq-ai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { symbol, timeframe, language = 'id', candles: clientCandles } = body;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      error: 'AI disabled',
      analysis: 'GROQ_API_KEY belum dikonfigurasi di Vercel. Set GROQ_API_KEY di Project Settings → Environment Variables.',
    }, { status: 503 });
  }

  // Use candles from request body first (sent by RightPanel), fall back to Supabase
  let candles = clientCandles;

  if (!candles || candles.length < 5) {
    try {
      const { getSupabaseAdmin } = await import('@/src/services/supabase');
      const sb = getSupabaseAdmin();
      const { data } = await sb
        .from('market_ohlcv')
        .select('open,high,low,close,volume,open_time')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('open_time', { ascending: false })
        .limit(20);
      if (data && data.length >= 5) candles = data.reverse();
    } catch {
      // Supabase not configured — use whatever candles we have
    }
  }

  if (!candles || candles.length < 5) {
    return NextResponse.json({ error: 'Insufficient data', analysis: 'Data candle tidak cukup untuk analisis.' }, { status: 400 });
  }

  const analysis = await groqReadChart(candles, symbol, timeframe, language);
  return NextResponse.json({ symbol, timeframe, analysis, mode: 'chart' });
}
