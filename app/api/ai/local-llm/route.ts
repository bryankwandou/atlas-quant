import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ai/local-llm?symbol=BTCUSDT&interval=1h
 *
 * Proves the local LLM works with zero external API.
 * - Fetches OHLCV via the multi-source aggregator
 * - Extracts 24 features locally
 * - Runs Renaissance composite engine
 * - Generates analyst commentary entirely from the local NLG engine
 *   over the bundled knowledge base.
 *
 * Returns the *same shape* the UI consumes — but never calls OpenRouter.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const timeframe = searchParams.get('interval') || '1h';

  try {
    const [{ getMultiSource }, { runRenaissanceSignal }, { extractFeatures }, { generateLocalCommentary }, { kbCount }] = await Promise.all([
      import('@/src/services/market/multiSource'),
      import('@/src/core/quant/renaissance'),
      import('@/src/ai/featureExtractor'),
      import('@/src/ai/local/nlg'),
      import('@/src/ai/local/knowledgeBase'),
    ]);

    const multi = await getMultiSource(symbol, timeframe, 300);
    if (!multi.candles.length) {
      return NextResponse.json({ error: 'No market data', symbol }, { status: 503 });
    }
    const features = extractFeatures(multi.candles);
    if (!features) {
      return NextResponse.json({ error: 'Insufficient data for AI', symbol }, { status: 422 });
    }
    const r = runRenaissanceSignal(multi.candles, {}, symbol);
    const commentary = generateLocalCommentary({
      symbol,
      timeframe,
      signal: r.signal,
      confidence: r.adjustedConfidence,
      price: multi.candles[multi.candles.length - 1].close,
      features,
      factors: r.factors,
      layerScores: r.layerScores,
      ensembleVotes: r.votes,
      mlProbability: r.mlProbability,
      kelly: r.kelly,
      tp1: r.tp1, tp2: r.tp2, tp3: r.tp3, sl: r.sl, rrRatio: r.rrRatio,
    });

    return NextResponse.json({
      symbol,
      timeframe,
      source: multi.source,
      candles_count: multi.candles.length,
      ai: commentary,
      signal: {
        type: r.signal,
        confidence: r.adjustedConfidence,
        renaissanceScore: r.renaissanceScore,
        layerScores: r.layerScores,
        kelly: r.kelly,
        pWin: r.pWin,
        mlProbability: r.mlProbability,
        tp1: r.tp1, tp2: r.tp2, tp3: r.tp3, sl: r.sl, rrRatio: r.rrRatio,
      },
      engine: {
        name: 'atlas-local-llm',
        version: 'v1',
        knowledgeBaseEntries: kbCount(),
        externalCalls: 0,
        notes: 'Local retrieval + NLG. Zero API key required.',
      },
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Local LLM error' }, { status: 500 });
  }
}
