import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai/chat   body: { question, symbol?, interval? }
 *
 * Fully local Q&A over the Atlas Quant knowledge base.
 *  - TF-IDF text retrieval ranks the best-matching KB entries
 *  - When `symbol` is provided, we also fetch live OHLCV and run the
 *    feature extractor to enrich the answer with current-state numbers
 *  - No external API. No model download. Zero key required.
 */
export async function POST(req: NextRequest) {
  try {
    const { question, symbol, interval } = (await req.json()) as {
      question?: string;
      symbol?: string;
      interval?: string;
    };
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question (string) is required.' }, { status: 400 });
    }

    const { searchKnowledge } = await import('@/src/ai/local/textRetrieval');
    const hits = searchKnowledge(question, 5);

    let context: any = null;
    if (symbol) {
      try {
        const [{ getMultiSource }, { extractFeatures }, { runRenaissanceSignal }] = await Promise.all([
          import('@/src/services/market/multiSource'),
          import('@/src/ai/featureExtractor'),
          import('@/src/core/quant/renaissance'),
        ]);
        const multi = await getMultiSource(symbol.toUpperCase(), interval || '1h', 300);
        if (multi.candles.length) {
          const features = extractFeatures(multi.candles);
          const r = runRenaissanceSignal(multi.candles, {}, symbol.toUpperCase());
          context = {
            symbol: symbol.toUpperCase(),
            timeframe: interval || '1h',
            price: multi.candles[multi.candles.length - 1].close,
            signal: r.signal,
            confidence: r.adjustedConfidence,
            renaissanceScore: r.renaissanceScore,
            layerScores: r.layerScores,
            mlProbability: r.mlProbability,
            kelly: r.kelly,
            features,
            source: multi.source,
          };
        }
      } catch {/* ignore — answer without live context */}
    }

    // Compose an answer
    const top = hits[0];
    const paragraphs: string[] = [];
    if (top) {
      const variant = top.entry.variants[0] ?? top.entry.title;
      const filled = variant
        .replace(/\{symbol\}/g, context?.symbol ?? '')
        .replace(/\{tf\}/g, context?.timeframe ?? '');
      paragraphs.push(filled);
      if (hits[1] && hits[1].similarity > 0.15) {
        paragraphs.push(
          `Related: ${hits[1].entry.title}. ${(hits[1].entry.variants[0] ?? '').replace(/\{symbol\}/g, context?.symbol ?? '').replace(/\{tf\}/g, context?.timeframe ?? '')}`
        );
      }
    } else {
      paragraphs.push(
        'I do not have a specific scenario in my local knowledge base for that question. Try rephrasing with terms like "RSI", "Bollinger Bands", "Wyckoff", "order block", or supply a symbol.'
      );
    }

    if (context) {
      paragraphs.push(
        `Live context (${context.symbol} ${context.timeframe}): signal ${context.signal} @ ${context.confidence}% · price ${context.price} · ML P(up)=${context.mlProbability?.toFixed?.(2) ?? '—'} · Kelly ${(context.kelly * 100).toFixed(2)}%.`
      );
    }

    const bullets = top ? top.entry.bullets.slice(0, 5) : [];
    const risk = top ? top.entry.risk[0] : 'No edge identified — stand aside.';

    return NextResponse.json({
      source: 'atlas-local-llm',
      model: 'atlas-local-llm:v2-chat',
      answer: paragraphs.join('\n\n'),
      bullets,
      risk,
      matchedScenarios: hits.map((h) => ({
        id: h.entry.id,
        title: h.entry.title,
        similarity: parseFloat(h.similarity.toFixed(3)),
        tags: h.entry.tags,
      })),
      liveContext: context,
      externalCalls: 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Chat error' }, { status: 500 });
  }
}
