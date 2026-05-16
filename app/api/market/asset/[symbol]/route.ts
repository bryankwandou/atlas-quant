/**
 * Compat endpoint untuk dashboard legacy.
 * Sekarang mengembalikan format yang sama tetapi memakai engine baru:
 *   - fetchOhlcv (binance/yahoo/dexscreener) — bukan synthetic
 *   - localBrainInfer (no API)
 *   - tidak perlu auth token (publik read-only)
 */
import { NextResponse } from 'next/server';
import { fetchOhlcv, type Timeframe } from '@/services/market/provider';
import { localBrainInfer } from '@/core/ai/local-brain';

export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();
  const { searchParams } = new URL(request.url);
  const intervalRaw = (searchParams.get('interval') || '1h').toLowerCase();
  const tfMap: Record<string, Timeframe> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '2h': '2h', '4h': '4h', '1d': '1d', 'daily': '1d',
  };
  const tf = tfMap[intervalRaw] || '1h';

  try {
    const candles = await fetchOhlcv({ symbol, timeframe: tf, limit: 200 });
    if (!candles.length) {
      return NextResponse.json({ error: 'Tidak ada data candle.' }, { status: 502 });
    }
    const brain = localBrainInfer({
      symbol, timeframe: tf,
      closes: candles.map((c) => c.close),
      highs: candles.map((c) => c.high),
      lows: candles.map((c) => c.low),
      volumes: candles.map((c) => c.volume),
      language: 'id',
    });
    return NextResponse.json({
      signal: {
        symbol,
        price: candles[candles.length - 1].close,
        quant: {
          regime: brain.regime,
          bias: brain.bias,
          confidence: brain.regimeConfidence / 100,
          risk_flags: brain.risks,
        },
        ai: {
          ai_regime_label: brain.regime.toUpperCase(),
          confidence_adjustment: 0,
          risk_commentary: brain.commentary,
        },
        timestamp: Math.floor(Date.now() / 1000),
      },
      candles: candles.map((c) => ({ ...c, time: Math.floor(c.time / 1000) })),
      brain,
      version: '2.0.0',
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch asset', detail: String(e) }, { status: 500 });
  }
}
