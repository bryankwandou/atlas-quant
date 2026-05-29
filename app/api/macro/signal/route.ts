export const dynamic = 'force-dynamic';
/**
 * POST /api/macro/signal
 * Body: { symbol: string; timeframe: string; candles?: OHLCVCandle[] }
 *
 * Fetches candles from the market router (Binance/Yahoo) if not provided,
 * then runs the macro-enhanced signal engine.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateMacroEnhancedSignal } from '@/src/core/quant/macro-signal';
import { getAllMacroData } from '@/src/services/macroData';
import { routeOHLCV } from '@/src/lib/marketRouter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      symbol = 'BTCUSDT',
      timeframe = '15m',
      candles: providedCandles,
    } = body as {
      symbol?: string;
      timeframe?: string;
      candles?: Array<{ open: number; high: number; low: number; close: number; volume: number }>;
    };

    // Fetch candles from market router if not provided
    let rawCandles = providedCandles;
    if (!rawCandles || rawCandles.length < 50) {
      const fetched = await routeOHLCV(symbol, timeframe, 200);
      rawCandles = fetched.map(c => ({
        open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
      }));
    }

    if (!rawCandles || rawCandles.length < 50) {
      return NextResponse.json(
        { error: 'Insufficient candle data (need ≥50 bars)' },
        { status: 400 },
      );
    }

    const closes  = rawCandles.map(c => c.close);
    const highs   = rawCandles.map(c => c.high);
    const lows    = rawCandles.map(c => c.low);
    const volumes = rawCandles.map(c => c.volume);

    // Fetch macro data in parallel with signal generation prep
    const macroData = await getAllMacroData();

    const signal = await generateMacroEnhancedSignal(
      closes, highs, lows, volumes, symbol, macroData,
    );

    return NextResponse.json({
      symbol,
      timeframe,
      signal,
      macro: {
        score: macroData.macroScore,
        bias: macroData.marketBias,
        riskLevel: macroData.riskLevel,
        fearGreed: macroData.fearGreed,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signal generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also support GET for simple use (reads from query params, no body)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get('symbol')    ?? 'BTCUSDT';
  const timeframe = searchParams.get('timeframe') ?? '15m';

  try {
    const [candles, macroData] = await Promise.all([
      routeOHLCV(symbol, timeframe, 200),
      getAllMacroData(),
    ]);

    if (!candles || candles.length < 50) {
      return NextResponse.json({ error: 'Insufficient candle data' }, { status: 400 });
    }

    const closes  = candles.map(c => c.close);
    const highs   = candles.map(c => c.high);
    const lows    = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    const signal = await generateMacroEnhancedSignal(
      closes, highs, lows, volumes, symbol, macroData,
    );

    return NextResponse.json({
      symbol, timeframe, signal,
      macro: {
        score: macroData.macroScore,
        bias: macroData.marketBias,
        riskLevel: macroData.riskLevel,
        fearGreed: macroData.fearGreed,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signal generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
