import { NextRequest, NextResponse } from 'next/server';
import { detectRegime } from '@/src/core/quant/regime-detector';
import { supabaseAdmin } from '@/src/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get('symbol')?.toUpperCase() || 'BTCUSDT';
  const timeframe = searchParams.get('timeframe') || '15m';

  const { data: candles } = await supabaseAdmin
    .from('market_ohlcv')
    .select('high,low,close,volume')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: true })
    .limit(200);

  if (!candles || candles.length < 50) {
    return NextResponse.json({ error: 'Insufficient data' }, { status: 400 });
  }

  const highs   = candles.map((c: any) => c.high);
  const lows    = candles.map((c: any) => c.low);
  const closes  = candles.map((c: any) => c.close);
  const volumes = candles.map((c: any) => c.volume);

  const regime = detectRegime(highs, lows, closes, volumes);
  return NextResponse.json({ symbol, timeframe, regime });
}
