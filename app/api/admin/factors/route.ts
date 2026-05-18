import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/src/services/admin/session';

/**
 * GET  /api/admin/factors?symbol=BTCUSDT
 * Debug endpoint: shows the live RenaissanceContext as it would be
 * passed to runRenaissanceSignal, plus which factor sources fired.
 *
 * This proves the engine is reading actual external data — not zeros.
 */
export async function GET(req: NextRequest) {
  const s = await verifyAdminSession();
  if (!s.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get('symbol') ?? 'BTCUSDT').toUpperCase();
    const { debugLiveContext } = await import('@/src/services/admin/externalFactorPipeline');
    const result = await debugLiveContext(symbol);
    return NextResponse.json({ symbol, ...result, timestamp: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Factor pipeline error' }, { status: 500 });
  }
}
