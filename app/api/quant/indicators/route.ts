import { NextRequest, NextResponse } from 'next/server';
import { ema, sma, dema, alma } from '@/src/core/indicators/trend';
import { rsi, macd, stochRsi, williamsR } from '@/src/core/indicators/momentum';
import { atr, bollingerBands } from '@/src/core/indicators/volatility';
import { vwap, obv, mfi, volumeSpike, williamsAD } from '@/src/core/indicators/volume';
import { supabaseAdmin } from '@/src/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol     = searchParams.get('symbol')?.toUpperCase() || 'BTCUSDT';
  const timeframe  = searchParams.get('timeframe') || '15m';
  const indicators = (searchParams.get('indicators') || 'EMA_9,EMA_21,RSI_7,VWAP,ATR').split(',');

  const { data: candles } = await supabaseAdmin
    .from('market_ohlcv')
    .select('open,high,low,close,volume,open_time')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: true })
    .limit(500);

  if (!candles || candles.length < 30) {
    return NextResponse.json({ error: 'Insufficient data' }, { status: 400 });
  }

  const closes  = candles.map((c: any) => c.close);
  const highs   = candles.map((c: any) => c.high);
  const lows    = candles.map((c: any) => c.low);
  const volumes = candles.map((c: any) => c.volume);

  const result: Record<string, any> = {};

  for (const ind of indicators) {
    if (ind === 'EMA_9')    result.EMA_9   = ema(closes, 9);
    if (ind === 'EMA_21')   result.EMA_21  = ema(closes, 21);
    if (ind === 'EMA_50')   result.EMA_50  = ema(closes, 50);
    if (ind === 'EMA_200')  result.EMA_200 = ema(closes, 200);
    if (ind === 'SMA_20')   result.SMA_20  = sma(closes, 20);
    if (ind === 'DEMA')     result.DEMA    = dema(closes, 21);
    if (ind === 'ALMA')     result.ALMA    = alma(closes, 21);
    if (ind === 'RSI_7')    result.RSI_7   = rsi(closes, 7);
    if (ind === 'RSI_14')   result.RSI_14  = rsi(closes, 14);
    if (ind === 'MACD')     result.MACD    = macd(closes);
    if (ind === 'STOCH_RSI') result.STOCH_RSI = stochRsi(closes);
    if (ind === 'WILLIAMS_R') result.WILLIAMS_R = williamsR(highs, lows, closes, 10);
    if (ind === 'ATR')      result.ATR     = atr(highs, lows, closes, 14);
    if (ind === 'BB')       result.BB      = bollingerBands(closes, 20, 2);
    if (ind === 'VWAP')     result.VWAP    = vwap(highs, lows, closes, volumes);
    if (ind === 'OBV')      result.OBV     = obv(closes, volumes);
    if (ind === 'MFI')      result.MFI     = mfi(highs, lows, closes, volumes, 14);
    if (ind === 'VOL_SPIKE') result.VOL_SPIKE = volumeSpike(volumes, 20, 2);
    if (ind === 'WILLIAMS_AD') result.WILLIAMS_AD = williamsAD(highs, lows, closes);
  }

  return NextResponse.json({ symbol, timeframe, indicators: result, count: candles.length });
}
