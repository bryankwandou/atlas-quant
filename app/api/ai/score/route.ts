import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/utils/auth-middleware';

/**
 * GET /api/ai/score?symbol=BTCUSDT&interval=1h
 *
 * Returns the local logistic-ensemble score on top of the deterministic
 * indicator stack. Optionally returns a DeepSeek/Llama commentary if
 * OPENROUTER_API_KEY is set.
 */
export async function GET(req: NextRequest) {
  const userKey = verifySessionToken(req);
  if (!userKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('interval') || '1h';
  const includeAI = searchParams.get('ai') !== 'false';

  try {
    const [{ getMultiSource }, { extractFeatures }, { predictLogistic, decideFromLogistic }, { runRenaissanceSignal }] = await Promise.all([
      import('@/src/services/market/multiSource'),
      import('@/src/ai/featureExtractor'),
      import('@/src/ai/logisticModel'),
      import('@/src/core/quant/renaissance'),
    ]);

    const multi = await getMultiSource(symbol, timeframe, 300);
    if (!multi.candles.length) {
      return NextResponse.json({ error: 'No market data available', symbol, providers: multi.notes }, { status: 503 });
    }

    const features = extractFeatures(multi.candles);
    if (!features) {
      return NextResponse.json({ error: 'Insufficient data for AI scoring (need 50+ bars)', symbol }, { status: 422 });
    }
    const logistic = predictLogistic(features);
    const decision = decideFromLogistic(logistic);

    const renaissance = runRenaissanceSignal(multi.candles, {}, symbol);

    let commentary = null as null | Awaited<ReturnType<typeof import('@/src/ai/openrouter').getAICommentary>>;
    if (includeAI) {
      const { getAICommentary } = await import('@/src/ai/openrouter');
      commentary = await getAICommentary({
        symbol,
        timeframe,
        signal: renaissance.signal,
        confidence: renaissance.adjustedConfidence,
        price: multi.candles[multi.candles.length - 1].close,
        factors: renaissance.factors,
        layerScores: renaissance.layerScores,
        ensembleVotes: renaissance.votes,
      });
    }

    return NextResponse.json({
      symbol,
      timeframe,
      source: multi.source,
      ticker: multi.ticker,
      logistic,
      decision,
      renaissance: {
        signal: renaissance.signal,
        confidence: renaissance.adjustedConfidence,
        renaissanceScore: renaissance.renaissanceScore,
        layerScores: renaissance.layerScores,
        kelly: renaissance.kelly,
        pWin: renaissance.pWin,
        pNoEdge: renaissance.pNoEdge,
        tp1: renaissance.tp1, tp2: renaissance.tp2, tp3: renaissance.tp3,
        sl: renaissance.sl, rrRatio: renaissance.rrRatio,
        atrValue: renaissance.atrValue,
        factors: renaissance.factors,
      },
      commentary,
      timestamp: Date.now(),
    });
  } catch (e: any) {
    console.error('[ai/score]', e);
    return NextResponse.json({ error: e?.message ?? 'AI scoring error' }, { status: 500 });
  }
}
