import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/src/core/quant/backtest-engine';
import { supabaseAdmin } from '@/src/services/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    symbol, timeframe,
    strategies = ['EMA_CROSS', 'BB_SQUEEZE'],
    initialCapital = 10000,
    riskPerTradePct = 1,
    commissionPct = 0.05,
    slippagePct = 0.01,
    startIndex = 50,
  } = body;

  const { data: rawCandles } = await supabaseAdmin
    .from('market_ohlcv')
    .select('*')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: true })
    .limit(1000);

  if (!rawCandles || rawCandles.length < 100) {
    return NextResponse.json({ error: 'Insufficient data for backtest (need 100+ candles)' }, { status: 400 });
  }

  const candles = rawCandles.map((c: any) => ({
    time: c.open_time, open: c.open, high: c.high, low: c.low,
    close: c.close, volume: c.volume,
  }));

  const result = await runBacktest(candles, {
    symbol, timeframe, strategies,
    initialCapital, riskPerTradePct, commissionPct, slippagePct, startIndex,
  });

  return NextResponse.json(result);
}
