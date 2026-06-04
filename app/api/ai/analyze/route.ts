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

  // Use candles from request body first (sent by RightPanel); else fetch live via
  // the resilient router (binance.vision) — NOT the paused Supabase.
  let candles = clientCandles;

  if (!candles || candles.length < 5) {
    try {
      const { routeOHLCV } = await import('@/src/lib/marketRouter');
      const data = await routeOHLCV(symbol, timeframe, 120);
      if (data && data.length >= 5) candles = data;
    } catch {
      // ignore — handled below
    }
  }

  if (!candles || candles.length < 5) {
    return NextResponse.json({ error: 'Insufficient data', analysis: 'Data candle tidak cukup untuk analisis.' }, { status: 400 });
  }

  const analysis = await groqReadChart(candles, symbol, timeframe, language);
  return NextResponse.json({ symbol, timeframe, analysis, mode: 'chart' });
}
