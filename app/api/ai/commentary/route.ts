import { NextRequest, NextResponse } from 'next/server';
import { groqAnalyze } from '@/src/services/groq-ai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { symbol, timeframe, signal, confidence, strategy, regime, indicators, entryPrice, tp1, sl } = body;

  if (!process.env.GROQ_API_KEY || process.env.FEATURE_AI_ENABLED !== 'true') {
    return NextResponse.json({ commentary: 'AI not configured', score: 50, keyRisks: [], validity: 'weak' });
  }

  const result = await groqAnalyze({ symbol, timeframe, signal, confidence, strategy, regime, indicators, entryPrice, tp1, sl });
  return NextResponse.json(result);
}
