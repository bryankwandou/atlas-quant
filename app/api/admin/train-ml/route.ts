import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';

/**
 * POST /api/admin/train-ml
 * body: { symbols?, timeframe?, horizon?, threshold?, epochs?, learningRate? }
 *
 * Trains the local logistic ensemble via SGD from historical OHLCV
 * across a basket of symbols. Reports actual training accuracy and
 * persists the new weights to ml_model_weights (if the schema was
 * migrated). Triggered from admin console.
 */
export async function POST(req: NextRequest) {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const opts = await req.json().catch(() => ({}));
    const { trainLogistic } = await import('@/src/services/admin/trainer');
    const result = await trainLogistic(opts);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Training error' }, { status: 500 });
  }
}
